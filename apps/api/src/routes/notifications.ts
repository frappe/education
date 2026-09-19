import { markReadBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import { list, markRead, unread } from "../notifications/service";
import { actorOf, requireAuth } from "../middleware/auth";
import { parseBody } from "./helpers";

/** Any signed in person. Everything is found from the session, never from an id in the request. */
export const notifications = new Hono<AppBindings>();

notifications.get("/notifications", requireAuth, async (c) => {
  return c.json(await list(await makeCtx(c), actorOf(c)));
});

notifications.get("/notifications/unread", requireAuth, async (c) => {
  return c.json({ unread: await unread(await makeCtx(c), actorOf(c)) });
});

notifications.post("/notifications/read", requireAuth, async (c) => {
  const body = await parseBody(c, markReadBody);
  return c.json({ unread: await markRead(await makeCtx(c), actorOf(c), body.ids) });
});
