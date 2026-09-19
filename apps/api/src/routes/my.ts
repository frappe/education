import { answerBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import { actorOf, requireStudent } from "../middleware/auth";
import { courseGet, courseList, handIn, saveDraft, workGet, workList } from "../my/service";
import { parseBody } from "./helpers";

/**
 * The student's side. Everything is found from the signed in person, never from an id in the request,
 * so an id in the address can only pick among their own things.
 */
export const my = new Hono<AppBindings>();

my.get("/my/courses", requireStudent, async (c) => {
  return c.json({ courses: await courseList(await makeCtx(c), actorOf(c)) });
});

my.get("/my/courses/:id", requireStudent, async (c) => {
  return c.json(await courseGet(await makeCtx(c), actorOf(c), c.req.param("id")));
});

my.get("/my/work", requireStudent, async (c) => {
  return c.json({ work: await workList(await makeCtx(c), actorOf(c)) });
});

my.get("/my/work/:id", requireStudent, async (c) => {
  return c.json({ work: await workGet(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

my.put("/my/work/:id/draft", requireStudent, async (c) => {
  const body = await parseBody(c, answerBody);
  return c.json({ work: await saveDraft(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

my.post("/my/work/:id/submit", requireStudent, async (c) => {
  const body = await parseBody(c, answerBody);
  return c.json({ work: await handIn(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});
