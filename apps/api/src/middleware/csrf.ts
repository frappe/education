import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../env";
import { AppError } from "../lib/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Every browser request that changes data must send this header. */
export const CLIENT_HEADER = "x-lms-client";

/**
 * CSRF defence for cookie-based sign in. Three checks, all must pass:
 *  1. Sec-Fetch-Site, when the browser sends it, must be same-origin (or none).
 *  2. Origin, when present, must match this host.
 *  3. A custom header is required. A cross-site page cannot add a custom header
 *     without a CORS preflight, and this API never allows cross-origin requests.
 * SameSite=Lax cookies are the first line of defence; this is the second.
 */
export const csrfProtection = createMiddleware<AppBindings>(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();

  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new AppError("ORIGIN_NOT_ALLOWED");
  }

  const origin = c.req.header("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new AppError("ORIGIN_NOT_ALLOWED");
    }
    if (originHost !== new URL(c.req.url).host) throw new AppError("ORIGIN_NOT_ALLOWED");
  }

  if (!c.req.header(CLIENT_HEADER)) throw new AppError("ORIGIN_NOT_ALLOWED");

  return next();
});
