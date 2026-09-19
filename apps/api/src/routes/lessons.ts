import { attendanceBody, cancelLessonBody, createLessonsBody, isoDate, updateLessonBody } from "@lms/shared";
import { Hono } from "hono";
import { z } from "zod";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import {
  attendanceSheet,
  calendar,
  courseLessons,
  createLessons,
  lessonCancel,
  lessonGet,
  lessonRestore,
  lessonUpdate,
  saveAttendance,
  studentAttendance,
} from "../lessons/service";
import { daysBetween } from "../lib/zone";
import { actorOf, requireTeacher } from "../middleware/auth";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const lessons = new Hono<AppBindings>();

/** Both days must be real dates, in order, and at most 92 days (about three months) apart. */
const range = z
  .object({ from: isoDate, to: isoDate })
  .refine((r) => daysBetween(r.from, r.to) >= 0 && daysBetween(r.from, r.to) <= 92, "range too long");

lessons.get("/lessons", requireTeacher, async (c) => {
  const q = range.parse(c.req.query()); // a bad range becomes a normal VALIDATION_FAILED error
  return c.json({ lessons: await calendar(await makeCtx(c), actorOf(c), q.from, q.to) });
});

lessons.get("/courses/:id/lessons", requireTeacher, async (c) => {
  return c.json({ lessons: await courseLessons(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

lessons.post("/courses/:id/lessons", requireTeacher, async (c) => {
  const body = await parseBody(c, createLessonsBody);
  return c.json({ lessons: await createLessons(await makeCtx(c), actorOf(c), c.req.param("id"), body) }, 201);
});

lessons.get("/lessons/:id", requireTeacher, async (c) => {
  return c.json({ lesson: await lessonGet(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

lessons.put("/lessons/:id", requireTeacher, async (c) => {
  const body = await parseBody(c, updateLessonBody);
  return c.json({ lessons: await lessonUpdate(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

lessons.post("/lessons/:id/cancel", requireTeacher, async (c) => {
  const body = await parseBody(c, cancelLessonBody);
  return c.json({ lessons: await lessonCancel(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

lessons.post("/lessons/:id/restore", requireTeacher, async (c) => {
  return c.json({ lesson: await lessonRestore(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

lessons.get("/lessons/:id/attendance", requireTeacher, async (c) => {
  return c.json(await attendanceSheet(await makeCtx(c), actorOf(c), c.req.param("id")));
});

lessons.put("/lessons/:id/attendance", requireTeacher, async (c) => {
  const body = await parseBody(c, attendanceBody);
  return c.json(await saveAttendance(await makeCtx(c), actorOf(c), c.req.param("id"), body));
});

lessons.get("/students/:id/attendance", requireTeacher, async (c) => {
  return c.json({ attendance: await studentAttendance(await makeCtx(c), actorOf(c), c.req.param("id")) });
});
