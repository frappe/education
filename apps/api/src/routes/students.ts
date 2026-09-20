import { addStudentBody, importStudentsBody, STUDENT_FILTERS, updateStudentBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import { actorOf, requireTeacher } from "../middleware/auth";
import {
  studentAdd,
  studentGet,
  studentImport,
  studentList,
  studentSetArchived,
  studentUpdate,
} from "../students/service";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const students = new Hono<AppBindings>();

students.get("/students", requireTeacher, async (c) => {
  const page = Number.parseInt(c.req.query("page") ?? "1", 10);
  const pageSize = Number.parseInt(c.req.query("pageSize") ?? "", 10);
  const result = await studentList(await makeCtx(c), actorOf(c), {
    search: c.req.query("search") ?? "",
    // An unknown word is the same as no word: the students who are not archived.
    filter: STUDENT_FILTERS.find((f) => f === c.req.query("status")) ?? "current",
    page: Number.isFinite(page) ? page : 1,
    ...(Number.isFinite(pageSize) ? { pageSize } : {}),
  });
  return c.json(result);
});

students.post("/students", requireTeacher, async (c) => {
  const body = await parseBody(c, addStudentBody);
  return c.json({ student: await studentAdd(await makeCtx(c), actorOf(c), body) }, 201);
});

// Fixed path first, so "import" is never read as a student id.
students.post("/students/import", requireTeacher, async (c) => {
  const body = await parseBody(c, importStudentsBody);
  return c.json(await studentImport(await makeCtx(c), actorOf(c), body));
});

students.get("/students/:id", requireTeacher, async (c) => {
  return c.json({ student: await studentGet(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

students.put("/students/:id", requireTeacher, async (c) => {
  const body = await parseBody(c, updateStudentBody);
  return c.json({ student: await studentUpdate(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

students.post("/students/:id/archive", requireTeacher, async (c) => {
  return c.json({ student: await studentSetArchived(await makeCtx(c), actorOf(c), c.req.param("id"), true) });
});

students.post("/students/:id/restore", requireTeacher, async (c) => {
  return c.json({
    student: await studentSetArchived(await makeCtx(c), actorOf(c), c.req.param("id"), false),
  });
});
