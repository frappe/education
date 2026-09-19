import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../env";

/**
 * Headers for API responses. Static pages get their headers from
 * apps/web/public/_headers, so the two files must stay in step.
 */
export const securityHeaders = createMiddleware<AppBindings>(async (c, next) => {
  await next();
  const h = c.res.headers;
  h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  // API answers are data only, never a page.
  h.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  // Private data must not be kept by any cache.
  h.set("Cache-Control", "no-store");
});
