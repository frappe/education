import type { Env } from "../env";
import { isLocalOrTest } from "../lib/config";
import { AppError } from "../lib/errors";

/**
 * Checks the Cloudflare Turnstile answer sent by the browser.
 * Local and test runs accept anything when no secret is set. Staging and production
 * refuse to run without a secret, so a missing setting can never turn the check off.
 */
export async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<void> {
  if (!env.TURNSTILE_SECRET) {
    if (isLocalOrTest(env)) return;
    throw new Error("TURNSTILE_SECRET is not set");
  }
  if (!token) throw new AppError("CAPTCHA_FAILED");

  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET);
  body.set("response", token);
  if (ip !== "unknown") body.set("remoteip", ip);

  let ok = false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    ok = ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    ok = false; // if we cannot check, we do not let the request through
  }
  if (!ok) throw new AppError("CAPTCHA_FAILED");
}

/**
 * True when sign in and sign up by an email link can work: the bot check is set up (or this is a local or test run).
 * When it is not, the screens hide those forms instead of showing a form that always fails.
 */
export const emailLinkAvailable = (env: Env): boolean => isLocalOrTest(env) || Boolean(env.TURNSTILE_SECRET);
