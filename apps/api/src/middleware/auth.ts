import { createMiddleware } from "hono/factory";
import { teacherMembership, type Actor } from "../auth/actor";
import { readSessionToken } from "../auth/session";
import type { AppBindings } from "../env";
import { sha256Hex } from "../lib/crypto";
import { AppError } from "../lib/errors";
import { findSessionByTokenHash, touchSession } from "../repos/sessions";
import { findUserById, membershipsOf } from "../repos/users";

const TOUCH_EVERY_MS = 5 * 60_000;

/**
 * Reads the session cookie and works out who is calling. Runs on every /api request.
 * No cookie, an ended session, or a paused account all simply mean "not signed in".
 */
export const loadActor = createMiddleware<AppBindings>(async (c, next) => {
  c.set("actor", null);
  const token = readSessionToken(c);
  if (token) {
    const db = c.env.DB;
    const session = await findSessionByTokenHash(db, await sha256Hex(token));
    if (session) {
      const now = Date.now();
      const idleUntil = new Date(session.last_seen_at).getTime() + session.idle_days * 86_400_000;
      const alive = new Date(session.expires_at).getTime() > now && idleUntil > now;
      const user = alive ? await findUserById(db, session.user_id) : null;
      if (user && !user.disabled_at) {
        // Written at most every 5 minutes, so reading a page does not cost a database write each time.
        if (now - new Date(session.last_seen_at).getTime() > TOUCH_EVERY_MS)
          await touchSession(db, session.id);
        const memberships = await membershipsOf(db, user.id);
        const actor: Actor = {
          userId: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.email_verified_at !== null,
          sessionId: session.id,
          memberships: memberships.map((m) => ({
            tenantId: m.tenant_id,
            tenantName: m.tenant_name,
            role: m.role,
          })),
        };
        c.set("actor", actor);
      }
    }
  }
  await next();
});

export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  if (!c.get("actor")) throw new AppError("UNAUTHENTICATED");
  await next();
});

export const requireTeacher = createMiddleware<AppBindings>(async (c, next) => {
  const actor = c.get("actor");
  if (!actor) throw new AppError("UNAUTHENTICATED");
  if (!teacherMembership(actor)) throw new AppError("FORBIDDEN");
  await next();
});

/** Gets the signed in actor inside a handler that already passed requireAuth. */
export function actorOf(c: { get(key: "actor"): Actor | null }): Actor {
  const actor = c.get("actor");
  if (!actor) throw new AppError("UNAUTHENTICATED");
  return actor;
}
