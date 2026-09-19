import { createCourseBody, updateCourseBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import { courseGet, courseList, courseSetArchived, courseUpdate, createCourse } from "../courses/service";
import type { AppBindings } from "../env";
import { actorOf, requireTeacher } from "../middleware/auth";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const courses = new Hono<AppBindings>();

courses.get("/courses", requireTeacher, async (c) => {
  const list = await courseList(await makeCtx(c), actorOf(c), c.req.query("archived") === "1");
  return c.json({ courses: list });
});

courses.post("/courses", requireTeacher, async (c) => {
  const body = await parseBody(c, createCourseBody);
  return c.json({ course: await createCourse(await makeCtx(c), actorOf(c), body) }, 201);
});

courses.get("/courses/:id", requireTeacher, async (c) => {
  return c.json({ course: await courseGet(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

courses.put("/courses/:id", requireTeacher, async (c) => {
  const body = await parseBody(c, updateCourseBody);
  return c.json({ course: await courseUpdate(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

courses.post("/courses/:id/archive", requireTeacher, async (c) => {
  return c.json({ course: await courseSetArchived(await makeCtx(c), actorOf(c), c.req.param("id"), true) });
});

courses.post("/courses/:id/restore", requireTeacher, async (c) => {
  return c.json({ course: await courseSetArchived(await makeCtx(c), actorOf(c), c.req.param("id"), false) });
});
