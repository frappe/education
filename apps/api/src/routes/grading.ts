import { extensionBody, gradeBody, returnBody, revisionBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import {
  askAgain,
  giveBack,
  giveMoreTime,
  grade,
  queue,
  submissionGet,
  submissionList,
  takeBackTime,
} from "../grading/service";
import { actorOf, requireTeacher } from "../middleware/auth";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const grading = new Hono<AppBindings>();

grading.get("/grading/queue", requireTeacher, async (c) => {
  return c.json({ queue: await queue(await makeCtx(c), actorOf(c)) });
});

grading.get("/assignments/:id/submissions", requireTeacher, async (c) => {
  return c.json({ submissions: await submissionList(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

grading.get("/assignments/:id/submissions/:studentId", requireTeacher, async (c) => {
  const detail = await submissionGet(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("studentId"),
  );
  return c.json({ submission: detail });
});

grading.put("/assignments/:id/submissions/:studentId/grade", requireTeacher, async (c) => {
  const body = await parseBody(c, gradeBody);
  const detail = await grade(await makeCtx(c), actorOf(c), c.req.param("id"), c.req.param("studentId"), body);
  return c.json({ submission: detail });
});

grading.post("/assignments/:id/submissions/:studentId/return", requireTeacher, async (c) => {
  const { version } = await parseBody(c, returnBody);
  const detail = await giveBack(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("studentId"),
    version,
  );
  return c.json({ submission: detail });
});

grading.post("/assignments/:id/submissions/:studentId/request-revision", requireTeacher, async (c) => {
  const body = await parseBody(c, revisionBody);
  const detail = await askAgain(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("studentId"),
    body,
  );
  return c.json({ submission: detail });
});

grading.put("/assignments/:id/extensions/:studentId", requireTeacher, async (c) => {
  const body = await parseBody(c, extensionBody);
  const list = await giveMoreTime(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("studentId"),
    body,
  );
  return c.json({ submissions: list });
});

grading.delete("/assignments/:id/extensions/:studentId", requireTeacher, async (c) => {
  const list = await takeBackTime(await makeCtx(c), actorOf(c), c.req.param("id"), c.req.param("studentId"));
  return c.json({ submissions: list });
});
