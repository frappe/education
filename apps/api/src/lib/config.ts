import type { Env } from "../env";

export const isLocalOrTest = (env: Env): boolean => env.ENVIRONMENT === "local" || env.ENVIRONMENT === "test";

/**
 * The address used in email links. It comes from configuration and never from the
 * request, so a forged Host header cannot point a reset link at another site.
 */
export function appUrl(env: Env): string {
  const url = env.APP_URL;
  const ok = isLocalOrTest(env) ? /^https?:\/\//.test(url) : /^https:\/\//.test(url);
  if (!ok) throw new Error("APP_URL is not set to a valid address for this environment");
  return url.replace(/\/+$/, "");
}

/** Key for hashing IPs and emails. Missing in staging or production is an error, never a silent default. */
export function hmacKey(env: Env): string {
  if (env.HMAC_KEY) return env.HMAC_KEY;
  if (isLocalOrTest(env)) return "local-dev-only-hmac-key";
  throw new Error("HMAC_KEY is not set");
}
