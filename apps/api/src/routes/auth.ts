import {
  changePasswordBody,
  consumeLinkBody,
  emailOnlyBody,
  resetPasswordBody,
  signInBody,
  signUpBody,
  tokenBody,
  type MeResponse,
  type SessionInfo,
} from "@lms/shared";
import { Hono } from "hono";
import {
  changePassword,
  consumeMagicLink,
  forgotPassword,
  login,
  makeCtx,
  requestMagicLink,
  resendVerification,
  resetPassword,
  signUp,
  verifyEmail,
} from "../auth/service";
import { clearSessionCookie, setSessionCookie } from "../auth/session";
import type { AppBindings } from "../env";
import { AppError } from "../lib/errors";
import { actorOf, requireAuth } from "../middleware/auth";
import { auditStatement } from "../audit";
import { listSessions, revokeAllSessions, revokeSession } from "../repos/sessions";
import { verifyTurnstile } from "../security/turnstile";
import { acceptInvite } from "../students/invites";
import { accepted, parseBody } from "./helpers";

export const auth = new Hono<AppBindings>();

// ------------------------------------------------------------ public

auth.post("/auth/sign-up", async (c) => {
  const body = await parseBody(c, signUpBody);
  const ctx = await makeCtx(c);
  await verifyTurnstile(c.env, body.captcha, ctx.ip);
  await signUp(ctx, body);
  return accepted(c); // same answer if the email is new or already used
});

auth.post("/auth/verify-email", async (c) => {
  const { token } = await parseBody(c, tokenBody);
  setSessionCookie(c, await verifyEmail(await makeCtx(c), token));
  return c.json({ ok: true });
});

auth.post("/auth/verify-email/resend", async (c) => {
  const body = await parseBody(c, emailOnlyBody);
  const ctx = await makeCtx(c);
  await verifyTurnstile(c.env, body.captcha, ctx.ip);
  await resendVerification(ctx, body.email);
  return accepted(c);
});

auth.post("/auth/sign-in", async (c) => {
  const body = await parseBody(c, signInBody);
  const ctx = await makeCtx(c);
  await verifyTurnstile(c.env, body.captcha, ctx.ip);
  setSessionCookie(c, await login(ctx, body));
  return c.json({ ok: true });
});

auth.post("/auth/password/forgot", async (c) => {
  const body = await parseBody(c, emailOnlyBody);
  const ctx = await makeCtx(c);
  await verifyTurnstile(c.env, body.captcha, ctx.ip);
  await forgotPassword(ctx, body.email);
  return accepted(c);
});

auth.post("/auth/password/reset", async (c) => {
  const body = await parseBody(c, resetPasswordBody);
  await resetPassword(await makeCtx(c), body.token, body.password);
  return c.json({ ok: true });
});

auth.post("/auth/magic-link/request", async (c) => {
  const body = await parseBody(c, emailOnlyBody);
  const ctx = await makeCtx(c);
  await verifyTurnstile(c.env, body.captcha, ctx.ip);
  await requestMagicLink(ctx, body.email);
  return accepted(c);
});

auth.post("/auth/magic-link/consume", async (c) => {
  const body = await parseBody(c, consumeLinkBody);
  setSessionCookie(c, await consumeMagicLink(await makeCtx(c), body.token, body.trustDevice ?? false));
  return c.json({ ok: true });
});

auth.post("/invites/accept", async (c) => {
  const body = await parseBody(c, consumeLinkBody);
  setSessionCookie(c, await acceptInvite(await makeCtx(c), body.token, body.trustDevice ?? false));
  return c.json({ ok: true });
});

// -------------------------------------------------------- signed in

auth.get("/me", requireAuth, (c) => {
  const actor = actorOf(c);
  const body: MeResponse = {
    user: { id: actor.userId, name: actor.name, email: actor.email, emailVerified: actor.emailVerified },
    memberships: actor.memberships,
  };
  return c.json(body);
});

auth.post("/auth/sign-out", requireAuth, async (c) => {
  const actor = actorOf(c);
  await c.env.DB.batch([revokeSession(c.env.DB, actor.userId, actor.sessionId)]);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.post("/auth/sign-out-everywhere", requireAuth, async (c) => {
  const actor = actorOf(c);
  await c.env.DB.batch([
    revokeAllSessions(c.env.DB, actor.userId),
    auditStatement(c.env.DB, { action: "auth.sign_out_everywhere", actorUserId: actor.userId }),
  ]);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.post("/auth/password/change", requireAuth, async (c) => {
  const body = await parseBody(c, changePasswordBody);
  await changePassword(await makeCtx(c), actorOf(c), body.currentPassword, body.newPassword);
  return c.json({ ok: true });
});

auth.get("/auth/sessions", requireAuth, async (c) => {
  const actor = actorOf(c);
  const rows = await listSessions(c.env.DB, actor.userId);
  const sessions: SessionInfo[] = rows.results.map((s) => ({
    id: s.id,
    createdAt: s.created_at,
    lastSeenAt: s.last_seen_at,
    userAgent: s.user_agent,
    current: s.id === actor.sessionId,
  }));
  return c.json({ sessions });
});

auth.delete("/auth/sessions/:id", requireAuth, async (c) => {
  const actor = actorOf(c);
  const id = c.req.param("id");
  // user_id is part of the statement, so nobody can end another person's session.
  const res = await revokeSession(c.env.DB, actor.userId, id).run();
  if (!res.meta.changes) throw new AppError("NOT_FOUND");
  if (id === actor.sessionId) clearSessionCookie(c);
  return c.json({ ok: true });
});
