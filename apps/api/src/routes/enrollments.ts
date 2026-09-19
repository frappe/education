import { enrollBody, updateEnrollmentBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import { courseRoster, enroll, studentCourses, updateEnrollment } from "../enrollments/service";
import type { AppBindings } from "../env";
import { actorOf, requireTeacher } from "../middleware/auth";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const enrollments = new Hono<AppBindings>();

enrollments.get("/courses/:id/students", requireTeacher, async (c) => {
  return c.json({ students: await courseRoster(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

enrollments.post("/courses/:id/students", requireTeacher, async (c) => {
  const body = await parseBody(c, enrollBody);
  return c.json(await enroll(await makeCtx(c), actorOf(c), c.req.param("id"), body));
});

enrollments.put("/courses/:id/students/:studentId", requireTeacher, async (c) => {
  const body = await parseBody(c, updateEnrollmentBody);
  const students = await updateEnrollment(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("studentId"),
    body,
  );
  return c.json({ students });
});

enrollments.get("/students/:id/courses", requireTeacher, async (c) => {
  return c.json({ courses: await studentCourses(await makeCtx(c), actorOf(c), c.req.param("id")) });
});
