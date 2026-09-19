import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import type { AppBindings, Env } from "../env";
import { hmacKey, isLocalOrTest } from "../lib/config";
import { fromBase64Url, hmacHex, timingSafeEqual, toBase64UrlText } from "../lib/crypto";

/**
 * What we must remember between sending the person to Google and getting them back.
 * It lives in a short cookie in their own browser, signed so nobody can change it. Nothing is
 * kept on the server, and the cookie is deleted the moment they come back.
 */
export const flowSchema = z.object({
  /** Must come back unchanged from Google. This stops someone else's sign in being forced on this browser. */
  state: z.string(),
  nonce: z.string(),
  /** The secret half of the code check (PKCE). */
  verifier: z.string(),
  intent: z.enum(["sign-in", "sign-up", "invite"]),
  /** Only for "invite": the link the student opened. */
  invite: z.string().optional(),
  /** The person said this is their own device. */
  keep: z.boolean(),
  /** When this stops being valid (milliseconds). */
  until: z.number(),
});
export type Flow = z.infer<typeof flowSchema>;

export const FLOW_MINUTES = 10;

const cookieName = (env: Env) => (isLocalOrTest(env) ? "glogin" : "__Host-glogin");
const sign = (env: Env, payload: string) => hmacHex(hmacKey(env), `google-flow:${payload}`);

export async function saveFlow(c: Context<AppBindings>, flow: Flow): Promise<void> {
  const payload = toBase64UrlText(JSON.stringify(flow));
  setCookie(c, cookieName(c.env), `${payload}.${await sign(c.env, payload)}`, {
    httpOnly: true,
    secure: !isLocalOrTest(c.env),
    sameSite: "Lax", // Lax is what lets the cookie come back when Google sends the person to us
    path: "/",
    maxAge: FLOW_MINUTES * 60,
  });
}

/** Reads and removes the cookie. Returns null if it is missing, changed, or too old. */
export async function takeFlow(c: Context<AppBindings>): Promise<Flow | null> {
  const raw = getCookie(c, cookieName(c.env));
  deleteCookie(c, cookieName(c.env), { path: "/", secure: !isLocalOrTest(c.env) });
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac || !timingSafeEqual(mac, await sign(c.env, payload))) return null;
  try {
    const flow = flowSchema.parse(JSON.parse(fromBase64Url(payload)));
    return flow.until > Date.now() ? flow : null;
  } catch {
    return null;
  }
}
