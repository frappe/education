import { LIMITS } from "@lms/shared";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppBindings, Env } from "../env";
import { isLocalOrTest } from "../lib/config";
import { randomToken, sha256Hex } from "../lib/crypto";
import { plusDays } from "../lib/time";
import { insertSession } from "../repos/sessions";

/**
 * "__Host-" makes the browser refuse the cookie unless it is Secure, has Path=/ and no
 * Domain, so another subdomain cannot set or replace it. Local http cannot use that prefix.
 */
export const cookieName = (env: Env): string => (isLocalOrTest(env) ? "sid" : "__Host-sid");

export interface NewSession {
  token: string;
  maxAgeSec: number;
}

/**
 * Starts a session. A fresh token is made every time, so an id planted before sign in
 * is never reused (no session fixation). Only the hash is stored.
 * `idleDays`: how long without use before the session ends.
 */
export async function startSession(
  env: Env,
  s: { userId: string; idleDays: number; userAgent: string | null; ipHash: string },
): Promise<{ session: NewSession; statement: D1PreparedStatement }> {
  const token = randomToken();
  const statement = insertSession(env.DB, {
    tokenHash: await sha256Hex(token),
    userId: s.userId,
    expiresAt: plusDays(LIMITS.sessionMaxDays),
    idleDays: s.idleDays,
    userAgent: s.userAgent,
    ipHash: s.ipHash,
  });
  return { session: { token, maxAgeSec: LIMITS.sessionMaxDays * 86400 }, statement };
}

export function setSessionCookie(c: Context<AppBindings>, session: NewSession): void {
  setCookie(c, cookieName(c.env), session.token, {
    httpOnly: true, // scripts on the page can never read it
    secure: !isLocalOrTest(c.env),
    sameSite: "Lax",
    path: "/",
    maxAge: session.maxAgeSec,
  });
}

export function clearSessionCookie(c: Context<AppBindings>): void {
  deleteCookie(c, cookieName(c.env), { path: "/", secure: !isLocalOrTest(c.env) });
}

export const readSessionToken = (c: Context<AppBindings>): string | undefined =>
  getCookie(c, cookieName(c.env));
