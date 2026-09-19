import { LIMITS, type SignUpBody } from "@lms/shared";
import type { Context } from "hono";
import { auditStatement } from "../audit";
import { getEmailProvider } from "../email/provider";
import type { EmailMessage } from "../email/provider";
import { magicLinkMessage, verifyEmailMessage } from "../email/templates";
import type { AppBindings, Env } from "../env";
import { appUrl, hmacKey } from "../lib/config";
import { hmacHex } from "../lib/crypto";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { consumeToken, newToken, revokeUserTokens } from "../repos/tokens";
import {
  findUserByEmail,
  findUserById,
  insertMembership,
  insertTenant,
  insertUser,
  markEmailVerified,
  membershipsOf,
  type UserRow,
} from "../repos/users";
import { hit } from "../security/rate-limit";
import { startSession, type NewSession } from "./session";

/** What every flow needs to know about the request. */
export interface Ctx {
  env: Env;
  ip: string;
  ipHash: string;
  userAgent: string | null;
  /**
   * Runs work after the answer was sent (sending an email takes a while). When there is no way to do
   * that (tests), the work is simply awaited, so the caller always gets the same result.
   */
  defer: (work: Promise<unknown>) => Promise<void>;
}

export async function makeCtx(c: Context<AppBindings>): Promise<Ctx> {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  let waitUntil: ((p: Promise<unknown>) => void) | undefined;
  try {
    waitUntil = c.executionCtx.waitUntil.bind(c.executionCtx);
  } catch {
    waitUntil = undefined; // no execution context (tests)
  }
  return {
    env: c.env,
    ip,
    ipHash: await hmacHex(hmacKey(c.env), `ip:${ip}`),
    userAgent: c.req.header("user-agent")?.slice(0, 200) ?? null,
    defer: async (work) => {
      // A failed email must never turn into an error for the person, and must not be silent for us.
      const safe = work.catch((err) =>
        console.error(JSON.stringify({ msg: "deferred work failed", err: String(err) })),
      );
      if (waitUntil) waitUntil(safe);
      else await safe;
    },
  };
}

const emailHash = (ctx: Ctx, email: string) => hmacHex(hmacKey(ctx.env), `email:${email}`);

/**
 * Sends an email, but at most 5 per hour to the same address. This stops the app from being used to
 * fill someone's inbox. Going over the limit is silent, so the answer to the caller never shows whether
 * the address has an account. The sending itself happens after the answer, so the time it takes cannot
 * show whether an email was sent.
 */
export async function sendMail(ctx: Ctx, message: EmailMessage): Promise<void> {
  const limit = await hit(ctx.env.DB, `mail:${await emailHash(ctx, message.to)}`, 5, 3600);
  if (!limit.allowed) return;
  // Even choosing the provider happens after the answer, so a wrong setting is logged for us and
  // never shows up as an error on only some requests (which would show who has an account).
  await ctx.defer((async () => getEmailProvider(ctx.env).send(message))());
}

/** Students who only use email links stay signed in for 1 day, unless they trust the device. */
function idleDaysFor(roles: string[], trustDevice: boolean): number {
  return roles.includes("teacher") || trustDevice ? LIMITS.sessionIdleDays : 1;
}

export async function openSession(
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

/** Slows down someone who tries many random links. */
async function limitTokenTries(ctx: Ctx): Promise<void> {
  const r = await hit(ctx.env.DB, `token:ip:${ctx.ipHash}`, 60, 900);
  if (!r.allowed) throw new AppError("RATE_LIMITED");
}

/**
 * Sends the link that lets this person in: the "confirm your email" link the first time, and the
 * "sign in" link after that. A newer link replaces an older one of the same kind.
 */
async function sendLinkTo(ctx: Ctx, user: UserRow): Promise<void> {
  if (user.disabled_at) return;
  const db = ctx.env.DB;
  const confirming = user.email_verified_at === null;
  const { token, statement } = await newToken(db, {
    kind: confirming ? "verify_email" : "magic_link",
    email: user.email,
    ttlMinutes: confirming ? 24 * 60 : LIMITS.magicLinkMinutes,
    userId: user.id,
  });
  await db.batch([revokeUserTokens(db, user.id, confirming ? "verify_email" : "magic_link"), statement]);
  const base = appUrl(ctx.env);
  await sendMail(
    ctx,
    confirming
      ? verifyEmailMessage(user.email, user.name, `${base}/verify-email?token=${token}`)
      : magicLinkMessage(user.email, user.name, `${base}/magic-link?token=${token}`),
  );
}

// ---------------------------------------------------------------- sign up

/**
 * Creates a teacher with their own tenant and emails a link to confirm the address.
 * If the email already has an account, that person gets a link to sign in instead, and the answer
 * to the caller is the same, so nobody can find out who has an account.
 */
export async function signUp(ctx: Ctx, input: SignUpBody): Promise<void> {
  const db = ctx.env.DB;
  const limit = await hit(db, `signup:ip:${ctx.ipHash}`, 10, 3600);
  if (!limit.allowed) throw new AppError("RATE_LIMITED");

  const existing = await findUserByEmail(db, input.email);
  if (existing) return sendLinkTo(ctx, existing);

  const userId = uuidv7();
  const tenantId = uuidv7();
  try {
    await db.batch([
      insertTenant(db, { id: tenantId, name: `${input.name}'s classroom` }),
      insertUser(db, {
        id: userId,
        email: input.email,
        name: input.name,
        passwordHash: null,
        verified: false,
      }),
      insertMembership(db, { userId, tenantId, role: "teacher" }),
      auditStatement(db, { action: "auth.sign_up", actorUserId: userId, tenantId, ipHash: ctx.ipHash }),
    ]);
  } catch (err) {
    // Two sign ups with the same email at the same moment: the database refused the second one.
    if (String(err).includes("UNIQUE")) {
      const now = await findUserByEmail(db, input.email);
      if (now) return sendLinkTo(ctx, now);
    }
    throw err;
  }
  const created = await findUserById(db, userId);
  if (created) await sendLinkTo(ctx, created);
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

// ---------------------------------------------------------------- sign in

/**
 * "Email me a link". Always answers the same, whether the address has an account or not.
 * Limits per address and per connection stop anyone from filling an inbox.
 */
export async function requestSignInLink(ctx: Ctx, email: string): Promise<void> {
  const db = ctx.env.DB;
  const ipLimit = await hit(db, `link:ip:${ctx.ipHash}`, 10, 3600);
  const mailLimit = await hit(db, `link:email:${await emailHash(ctx, email)}`, 5, 3600);
  if (!ipLimit.allowed || !mailLimit.allowed) return; // same quiet answer as success

  const user = await findUserByEmail(db, email);
  if (user) await sendLinkTo(ctx, user);
}

export async function consumeSignInLink(ctx: Ctx, token: string, trustDevice: boolean): Promise<NewSession> {
  await limitTokenTries(ctx);
  const row = await consumeToken(ctx.env.DB, token, "magic_link");
  if (!row?.user_id) throw new AppError("LINK_EXPIRED");

  const user = await findUserById(ctx.env.DB, row.user_id);
  const memberships = await membershipsOf(ctx.env.DB, row.user_id);
  if (!user || user.disabled_at || memberships.length === 0) throw new AppError("ACCOUNT_PAUSED");

  return openSession(ctx, user.id, { trustDevice, action: "auth.sign_in_link" });
}
