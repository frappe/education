import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../env";

/** Gives every request an id that appears in logs and in error responses. */
export const requestId = createMiddleware<AppBindings>(async (c, next) => {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  await next();
  c.header("X-Request-Id", id);
});
