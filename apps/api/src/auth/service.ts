import { LIMITS, type SignInBody, type SignUpBody } from "@lms/shared";
import type { Context } from "hono";
import { audit, auditStatement } from "../audit";
import { getEmailProvider } from "../email/provider";
import {
  alreadyHaveAccountMessage,
  magicLinkMessage,
  resetPasswordMessage,
  verifyEmailMessage,
} from "../email/templates";
import type { AppBindings, Env } from "../env";
import { appUrl, hmacKey } from "../lib/config";
import { hmacHex, randomToken } from "../lib/crypto";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { consumeToken, isTokenValid, newToken, revokeUserTokens } from "../repos/tokens";
import { revokeAllSessions } from "../repos/sessions";
import {
  findUserByEmail,
  findUserById,
  insertMembership,
  insertTenant,
  insertUser,
  markEmailVerified,
  membershipsOf,
  setPassword,
} from "../repos/users";
import { hit, peek, reset } from "../security/rate-limit";
import { isPwned } from "../security/pwned";
import type { Actor } from "./actor";
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { startSession, type NewSession } from "./session";

/** What every flow needs to know about the request. */
export interface Ctx {
  env: Env;
  ip: string;
  ipHash: string;
  userAgent: string | null;
}

export async function makeCtx(c: Context<AppBindings>): Promise<Ctx> {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  return {
    env: c.env,
    ip,
    ipHash: await hmacHex(hmacKey(c.env), `ip:${ip}`),
    userAgent: c.req.header("user-agent")?.slice(0, 200) ?? null,
  };
}

const emailHash = (ctx: Ctx, email: string) => hmacHex(hmacKey(ctx.env), `email:${email}`);

/** Signing in with a wrong password for an unknown email must take as long as for a known one. */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

const fieldError = (field: string, message: string) =>
  new AppError("VALIDATION_FAILED", { fields: { [field]: message } });

async function assertPasswordAcceptable(password: string): Promise<void> {
  if (await isPwned(password)) {
    throw fieldError("password", "This password appeared in a data leak. Please choose a different one.");
  }
}

/**
 * Sends an email, but at most 5 per hour to the same address. This stops the app from
 * being used to fill someone's inbox. Going over the limit is silent, so the answer to the
 * caller never shows whether the address has an account.
 */
export async function sendMail(
  ctx: Ctx,
  message: Parameters<ReturnType<typeof getEmailProvider>["send"]>[0],
): Promise<void> {
  const limit = await hit(ctx.env.DB, `mail:${await emailHash(ctx, message.to)}`, 5, 3600);
  if (!limit.allowed) return;
  await getEmailProvider(ctx.env).send(message);
}

/** Students who only use magic links stay signed in for 1 day, unless they trust the device. */
function idleDaysFor(roles: string[], trustDevice: boolean): number {
  return roles.includes("teacher") || trustDevice ? LIMITS.sessionIdleDays : 1;
}

async function openSession(
  ctx: Ctx,
  userId: string,
  opts: { trustDevice?: boolean; before?: D1PreparedStatement[]; action: string; tenantId?: string | null },
): Promise<NewSession> {
  const memberships = await membershipsOf(ctx.env.DB, userId);
  const { session, statement } = await startSession(ctx.env, {
    userId,
    idleDays: idleDaysFor(
      memberships.map((m) => m.role),
      opts.trustDevice ?? false,
    ),
    userAgent: ctx.userAgent,
    ipHash: ctx.ipHash,
  });
  await ctx.env.DB.batch([
    ...(opts.before ?? []),
    statement,
    auditStatement(ctx.env.DB, {
      action: opts.action,
      actorUserId: userId,
      tenantId: opts.tenantId ?? memberships[0]?.tenant_id ?? null,
      ipHash: ctx.ipHash,
    }),
  ]);
  return session;
}

// ---------------------------------------------------------------- sign up

export async function signUp(ctx: Ctx, input: SignUpBody): Promise<void> {
  const db = ctx.env.DB;
  const limit = await hit(db, `signup:ip:${ctx.ipHash}`, 10, 3600);
  if (!limit.allowed) throw new AppError("RATE_LIMITED");

  await assertPasswordAcceptable(input.password);
  // Hash even when the email is already used, so both cases take the same time.
  const passwordHash = await hashPassword(input.password);

  const existing = await findUserByEmail(db, input.email);
  if (existing) {
    await sendExistsNotice(ctx, existing.email, existing.name);
    return;
  }

  const userId = uuidv7();
  const tenantId = uuidv7();
  const { token, statement } = await newToken(db, {
    kind: "verify_email",
    email: input.email,
    ttlMinutes: 24 * 60,
    userId,
  });

  try {
    await db.batch([
      insertTenant(db, { id: tenantId, name: `${input.name}'s classroom` }),
      insertUser(db, { id: userId, email: input.email, name: input.name, passwordHash, verified: false }),
      insertMembership(db, { userId, tenantId, role: "teacher" }),
      statement,
      auditStatement(db, { action: "auth.sign_up", actorUserId: userId, tenantId, ipHash: ctx.ipHash }),
    ]);
  } catch (err) {
    // Two sign ups with the same email at the same moment: the database refused the second one.
    if (String(err).includes("UNIQUE")) {
      await sendExistsNotice(ctx, input.email, input.name);
      return;
    }
    throw err;
  }

  await sendMail(
    ctx,
    verifyEmailMessage(input.email, input.name, `${appUrl(ctx.env)}/verify-email?token=${token}`),
  );
}

async function sendExistsNotice(ctx: Ctx, email: string, name: string): Promise<void> {
  const base = appUrl(ctx.env);
  await sendMail(ctx, alreadyHaveAccountMessage(email, name, `${base}/sign-in`, `${base}/forgot-password`));
}

// ------------------------------------------------------- confirm email

export async function verifyEmail(ctx: Ctx, token: string): Promise<NewSession> {
  await limitTokenTries(ctx);
  const row = await consumeToken(ctx.env.DB, token, "verify_email");
  if (!row?.user_id) throw new AppError("LINK_EXPIRED");
  return openSession(ctx, row.user_id, {
    before: [markEmailVerified(ctx.env.DB, row.user_id)],
    action: "auth.email_verified",
  });
}

/** Slows down someone who tries many random links. */
async function limitTokenTries(ctx: Ctx): Promise<void> {
  const r = await hit(ctx.env.DB, `token:ip:${ctx.ipHash}`, 60, 900);
  if (!r.allowed) throw new AppError("RATE_LIMITED");
}

/** For someone who lost or never got the first confirm email. Same quiet answer in every case. */
export async function resendVerification(ctx: Ctx, email: string): Promise<void> {
  const db = ctx.env.DB;
  const ipLimit = await hit(db, `verify:ip:${ctx.ipHash}`, 10, 3600);
  const mailLimit = await hit(db, `verify:email:${await emailHash(ctx, email)}`, 3, 3600);
  if (!ipLimit.allowed || !mailLimit.allowed) return;

  const user = await findUserByEmail(db, email);
  if (!user || user.disabled_at || user.email_verified_at) return;

  const { token, statement } = await newToken(db, {
    kind: "verify_email",
    email,
    ttlMinutes: 24 * 60,
    userId: user.id,
  });
  await db.batch([revokeUserTokens(db, user.id, "verify_email"), statement]);
  await sendMail(ctx, verifyEmailMessage(email, user.name, `${appUrl(ctx.env)}/verify-email?token=${token}`));
}

// ---------------------------------------------------------------- sign in

const LOGIN_PAIR_LIMIT = 5; // wrong tries per email + address
const LOGIN_ACCOUNT_LIMIT = 30; // wrong tries per email, from anywhere, per hour
const LOGIN_IP_LIMIT = 30; // tries per address

export async function login(ctx: Ctx, input: SignInBody): Promise<NewSession> {
  const db = ctx.env.DB;
  const eh = await emailHash(ctx, input.email);

  const ipRate = await hit(db, `login:ip:${ctx.ipHash}`, LOGIN_IP_LIMIT, 900);
  if (!ipRate.allowed) throw new AppError("RATE_LIMITED");

  // Counted by hash even for emails that do not exist, so the lock never shows if an account exists.
  const pairKey = `login:pair:${eh}:${ctx.ipHash}`;
  const acctKey = `login:acct:${eh}`;
  const [pair, acct] = await Promise.all([
    peek(db, pairKey, LOGIN_PAIR_LIMIT, 900),
    peek(db, acctKey, LOGIN_ACCOUNT_LIMIT, 3600),
  ]);
  if (!pair.allowed || !acct.allowed) throw new AppError("ACCOUNT_LOCKED");

  const user = await findUserByEmail(db, input.email);
  const matches = await verifyPassword(input.password, user?.password_hash ?? (await getDummyHash()));

  if (!user || !user.password_hash || !matches) {
    await Promise.all([hit(db, pairKey, LOGIN_PAIR_LIMIT, 900), hit(db, acctKey, LOGIN_ACCOUNT_LIMIT, 3600)]);
    await audit(db, {
      action: "auth.sign_in_failed",
      actorUserId: user?.id ?? null,
      ipHash: ctx.ipHash,
      meta: { emailHash: eh },
    });
    throw new AppError("INVALID_CREDENTIALS");
  }

  await reset(db, pairKey);

  // These checks come after the password check, so they never reveal anything to a guesser.
  const memberships = await membershipsOf(db, user.id);
  if (user.disabled_at || memberships.length === 0) throw new AppError("ACCOUNT_PAUSED");
  if (!user.email_verified_at) throw new AppError("EMAIL_NOT_VERIFIED");

  const before: D1PreparedStatement[] = [];
  if (needsRehash(user.password_hash))
    before.push(setPassword(db, user.id, await hashPassword(input.password)));
  return openSession(ctx, user.id, { before, action: "auth.sign_in" });
}

// ------------------------------------------------------------- passwords

export async function forgotPassword(ctx: Ctx, email: string): Promise<void> {
  const db = ctx.env.DB;
  const ipLimit = await hit(db, `forgot:ip:${ctx.ipHash}`, 10, 3600);
  const mailLimit = await hit(db, `forgot:email:${await emailHash(ctx, email)}`, 3, 3600);
  if (!ipLimit.allowed || !mailLimit.allowed) return; // same quiet answer as success

  const user = await findUserByEmail(db, email);
  if (!user || user.disabled_at) return;

  const { token, statement } = await newToken(db, {
    kind: "password_reset",
    email,
    ttlMinutes: 60,
    userId: user.id,
  });
  // A newer reset link replaces older ones.
  await db.batch([revokeUserTokens(db, user.id, "password_reset"), statement]);
  await sendMail(
    ctx,
    resetPasswordMessage(email, user.name, `${appUrl(ctx.env)}/reset-password?token=${token}`),
  );
}

export async function resetPassword(ctx: Ctx, token: string, password: string): Promise<void> {
  const db = ctx.env.DB;
  await limitTokenTries(ctx);
  // Check the link first, so a wrong link does not cost us a slow password hash.
  if (!(await isTokenValid(db, token, "password_reset"))) throw new AppError("LINK_EXPIRED");
  // A refused (weak) password does not use up the link.
  await assertPasswordAcceptable(password);
  const passwordHash = await hashPassword(password);

  const row = await consumeToken(db, token, "password_reset");
  if (!row?.user_id) throw new AppError("LINK_EXPIRED");

  await db.batch([
    setPassword(db, row.user_id, passwordHash),
    markEmailVerified(db, row.user_id), // the link came to this inbox, so the address is proven
    revokeAllSessions(db, row.user_id), // anyone who had the old password is signed out
    auditStatement(db, { action: "auth.password_reset", actorUserId: row.user_id, ipHash: ctx.ipHash }),
  ]);
}

export async function changePassword(ctx: Ctx, actor: Actor, current: string, next: string): Promise<void> {
  const db = ctx.env.DB;
  const limit = await hit(db, `change:${actor.userId}`, 5, 900);
  if (!limit.allowed) throw new AppError("RATE_LIMITED");

  const user = await findUserById(db, actor.userId);
  const ok = await verifyPassword(current, user?.password_hash ?? (await getDummyHash()));
  if (!user?.password_hash || !ok) throw fieldError("currentPassword", "This password is not correct.");

  await assertPasswordAcceptable(next);
  await db.batch([
    setPassword(db, user.id, await hashPassword(next)),
    revokeAllSessions(db, user.id, actor.sessionId), // other devices are signed out, this one stays
    auditStatement(db, { action: "auth.password_changed", actorUserId: user.id, ipHash: ctx.ipHash }),
  ]);
}

// ------------------------------------------------------------ magic link

export async function requestMagicLink(ctx: Ctx, email: string): Promise<void> {
  const db = ctx.env.DB;
  const ipLimit = await hit(db, `magic:ip:${ctx.ipHash}`, 10, 3600);
  const mailLimit = await hit(db, `magic:email:${await emailHash(ctx, email)}`, 3, 3600);
  if (!ipLimit.allowed || !mailLimit.allowed) return;

  const user = await findUserByEmail(db, email);
  if (!user || user.disabled_at || !user.email_verified_at) return;

  const { token, statement } = await newToken(db, {
    kind: "magic_link",
    email,
    ttlMinutes: LIMITS.magicLinkMinutes,
    userId: user.id,
  });
  await statement.run();
  await sendMail(ctx, magicLinkMessage(email, user.name, `${appUrl(ctx.env)}/magic-link?token=${token}`));
}

export async function consumeMagicLink(ctx: Ctx, token: string, trustDevice: boolean): Promise<NewSession> {
  await limitTokenTries(ctx);
  const row = await consumeToken(ctx.env.DB, token, "magic_link");
  if (!row?.user_id) throw new AppError("LINK_EXPIRED");

  const user = await findUserById(ctx.env.DB, row.user_id);
  const memberships = await membershipsOf(ctx.env.DB, row.user_id);
  if (!user || user.disabled_at || memberships.length === 0) throw new AppError("ACCOUNT_PAUSED");

  return openSession(ctx, user.id, { trustDevice, action: "auth.sign_in_magic_link" });
}

// --------------------------------------------------- used by invites too

export { openSession };
