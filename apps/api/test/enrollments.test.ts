import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { addStudent, call, createCourse, createStudent, createTeacher, type Person } from "./helpers";

const enroll = (t: Person, courseId: string, studentIds: string[], customPrice: number | null = null) =>
  call(`/api/courses/${courseId}/students`, {
    method: "POST",
    cookie: t.cookie,
    body: { studentIds, customPrice },
  });
const roster = (t: Person, courseId: string) =>
  call(`/api/courses/${courseId}/students`, { cookie: t.cookie });
const setStatus = (
  t: Person,
  courseId: string,
  studentId: string,
  status: string,
  customPrice: number | null = null,
) =>
  call(`/api/courses/${courseId}/students/${studentId}`, {
    method: "PUT",
    cookie: t.cookie,
    body: { status, customPrice },
  });
const enrolledCount = async (t: Person, courseId: string) =>
  (await call(`/api/courses/${courseId}`, { cookie: t.cookie })).json.course.enrolledCount as number;
const outcomes = (res: { json: { results: { result: string }[] } }) => res.json.results.map((r) => r.result);

describe("add students to a course", () => {
  it("adds several students at once and shows them in the roster", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const [a, b] = [await addStudent(t, { name: "Anh" }), await addStudent(t, { name: "Bao" })];
    const res = await enroll(t, course.id, [a.id, b.id]);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ enrolled: 2 });
    expect(outcomes(res)).toEqual(["enrolled", "enrolled"]);
    const list = await roster(t, course.id);
    expect(list.json.students).toMatchObject([
      { studentName: "Anh", status: "active", customPrice: null, studentArchived: false },
      { studentName: "Bao", status: "active" },
    ]);
    expect(await enrolledCount(t, course.id)).toBe(2);
  });

  it("works for a student who has not joined yet (only a profile)", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    expect(outcomes(await enroll(t, course.id, [s.id]))).toEqual(["enrolled"]);
  });

  it("works for a student who joined through an invite", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const kid = await createStudent(t);
    const id = (await call("/api/students", { cookie: t.cookie })).json.students.find(
      (s: { email: string }) => s.email === kid.email,
    ).id;
    expect(outcomes(await enroll(t, course.id, [id]))).toEqual(["enrolled"]);
  });

  it("says 'already enrolled' for a student who is in the course, and does not add twice", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    await enroll(t, course.id, [s.id]);
    const again = await enroll(t, course.id, [s.id]);
    expect(outcomes(again)).toEqual(["already_enrolled"]);
    expect(again.json.enrolled).toBe(0);
    const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?")
      .bind(course.id)
      .first<{ n: number }>();
    expect(rows?.n).toBe(1);
  });

  it("counts a student once when the same id is sent twice", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    const res = await enroll(t, course.id, [s.id, s.id]);
    expect(res.json.results.length).toBe(1);
    expect(res.json.enrolled).toBe(1);
  });

  it("can give a student a price of their own (a discount), including free", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { pricePerLesson: 150000 });
    const [a, b] = [await addStudent(t, { name: "Anh" }), await addStudent(t, { name: "Bao" })];
    await enroll(t, course.id, [a.id], 100000);
    await enroll(t, course.id, [b.id], 0);
    const list = (await roster(t, course.id)).json.students;
    expect(list.map((s: { customPrice: number | null }) => s.customPrice)).toEqual([100000, 0]);
  });

  it("refuses bad input: no students, too many, a negative or fractional price", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    expect((await enroll(t, course.id, [])).status).toBe(400);
    expect(
      (
        await enroll(
          t,
          course.id,
          Array.from({ length: 101 }, (_, i) => `id-${i}`),
        )
      ).status,
    ).toBe(400);
    const s = await addStudent(t);
    expect((await enroll(t, course.id, [s.id], -5)).status).toBe(400);
    expect((await enroll(t, course.id, [s.id], 1.5)).status).toBe(400);
  });

  it("refuses an archived student and an archived course", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    await call(`/api/students/${s.id}/archive`, { method: "POST", cookie: t.cookie });
    expect(outcomes(await enroll(t, course.id, [s.id]))).toEqual(["not_found"]);

    const live = await addStudent(t);
    await call(`/api/courses/${course.id}/archive`, { method: "POST", cookie: t.cookie });
    const res = await enroll(t, course.id, [live.id]);
    expect(res.status).toBe(409);
    expect(res.json.error.message).toMatch(/archived/);
  });
});

describe("the course seat limit", () => {
  it("stops at the limit inside one request and says who could not join", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: 2 });
    const kids = [];
    for (const name of ["A", "B", "C", "D"]) kids.push(await addStudent(t, { name }));
    const res = await enroll(
      t,
      course.id,
      kids.map((k) => k.id),
    );
    expect(outcomes(res)).toEqual(["enrolled", "enrolled", "full", "full"]);
    expect(res.json.enrolled).toBe(2);
    expect(await enrolledCount(t, course.id)).toBe(2);
  });

  it("lets only 2 of 6 simultaneous requests take the 2 seats", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: 2 });
    const kids = await Promise.all(Array.from({ length: 6 }, (_, i) => addStudent(t, { name: `Kid ${i}` })));
    const results = await Promise.all(kids.map((k) => enroll(t, course.id, [k.id])));
    expect(results.flatMap(outcomes).filter((r) => r === "enrolled").length).toBe(2);
    expect(results.flatMap(outcomes).filter((r) => r === "full").length).toBe(4);
    expect(await enrolledCount(t, course.id)).toBe(2);
  });

  it("a course without a limit takes everyone", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: null });
    const kids = await Promise.all(Array.from({ length: 12 }, (_, i) => addStudent(t, { name: `Kid ${i}` })));
    const res = await enroll(
      t,
      course.id,
      kids.map((k) => k.id),
    );
    expect(res.json.enrolled).toBe(12);
  });

  it("a dropped student frees a seat, and an archived student does not hold one", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: 2 });
    const [a, b, c] = [await addStudent(t), await addStudent(t), await addStudent(t)];
    await enroll(t, course.id, [a.id, b.id]);
    expect(outcomes(await enroll(t, course.id, [c.id]))).toEqual(["full"]);

    await setStatus(t, course.id, a.id, "dropped");
    expect(await enrolledCount(t, course.id)).toBe(1);
    expect(outcomes(await enroll(t, course.id, [c.id]))).toEqual(["enrolled"]);

    await call(`/api/students/${b.id}/archive`, { method: "POST", cookie: t.cookie });
    expect(await enrolledCount(t, course.id)).toBe(1);
    const d = await addStudent(t);
    expect(outcomes(await enroll(t, course.id, [d.id]))).toEqual(["enrolled"]);
  });

  it("the limit can be lowered below the number of students without removing anyone", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: 3 });
    const kids = [await addStudent(t), await addStudent(t), await addStudent(t)];
    await enroll(
      t,
      course.id,
      kids.map((k) => k.id),
    );
    await call(`/api/courses/${course.id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { name: "English A1", pricePerLesson: 1, maxStudents: 1, version: 1 },
    });
    expect(await enrolledCount(t, course.id)).toBe(3);
    const extra = await addStudent(t);
    expect(outcomes(await enroll(t, course.id, [extra.id]))).toEqual(["full"]);
  });
});

describe("change or remove a student in a course", () => {
  it("marks a student as dropped or completed, and joining again reuses the same row", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    await enroll(t, course.id, [s.id], 90000);
    const dropped = await setStatus(t, course.id, s.id, "dropped", 90000);
    expect(dropped.json.students[0]).toMatchObject({ status: "dropped" });
    expect(dropped.json.students[0].endedAt).not.toBeNull();

    const back = await enroll(t, course.id, [s.id], 50000);
    expect(outcomes(back)).toEqual(["enrolled"]);
    const row = (await roster(t, course.id)).json.students[0];
    expect(row).toMatchObject({ status: "active", customPrice: 50000, endedAt: null });
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS n, MAX(version) AS v FROM enrollments WHERE course_id = ?",
    )
      .bind(course.id)
      .first<{ n: number; v: number }>();
    expect(count).toEqual({ n: 1, v: 3 });

    expect((await setStatus(t, course.id, s.id, "completed")).json.students[0].status).toBe("completed");
  });

  it("can change the price of one student without changing the status", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    await enroll(t, course.id, [s.id]);
    const res = await setStatus(t, course.id, s.id, "active", 70000);
    expect(res.json.students[0]).toMatchObject({ status: "active", customPrice: 70000 });
    expect((await setStatus(t, course.id, s.id, "active", null)).json.students[0].customPrice).toBeNull();
  });

  it("refuses to put someone back into a full course", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: 1 });
    const [a, b] = [await addStudent(t), await addStudent(t)];
    await enroll(t, course.id, [a.id]);
    await setStatus(t, course.id, a.id, "dropped");
    await enroll(t, course.id, [b.id]);
    const res = await setStatus(t, course.id, a.id, "active");
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("COURSE_FULL");
  });

  it("does not accept 'pending' or made-up statuses", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    await enroll(t, course.id, [s.id]);
    expect((await setStatus(t, course.id, s.id, "pending")).status).toBe(400);
    expect((await setStatus(t, course.id, s.id, "banana")).status).toBe(400);
  });

  it("answers 404 for a student who was never in the course, and 409 in an archived course", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const s = await addStudent(t);
    expect((await setStatus(t, course.id, s.id, "dropped")).status).toBe(404);
    await enroll(t, course.id, [s.id]);
    await call(`/api/courses/${course.id}/archive`, { method: "POST", cookie: t.cookie });
    expect((await setStatus(t, course.id, s.id, "dropped")).status).toBe(409);
  });
});

describe("a student's courses", () => {
  it("lists the courses of one student with their price", async () => {
    const t = await createTeacher();
    const [c1, c2] = [
      await createCourse(t, { name: "Math", pricePerLesson: 200000 }),
      await createCourse(t, { name: "English", pricePerLesson: 150000 }),
    ];
    const s = await addStudent(t);
    await enroll(t, c1.id, [s.id], 180000);
    await enroll(t, c2.id, [s.id]);
    await setStatus(t, c2.id, s.id, "dropped");
    const res = await call(`/api/students/${s.id}/courses`, { cookie: t.cookie });
    expect(res.json.courses).toMatchObject([
      { courseName: "Math", status: "active", customPrice: 180000, pricePerLesson: 200000 },
      { courseName: "English", status: "dropped", customPrice: null, pricePerLesson: 150000 },
    ]);
  });
});

describe("one teacher can never reach another teacher's courses or students", () => {
  it("cannot read the roster, add, change, or list courses of another teacher's data", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    const course = await createCourse(a);
    const student = await addStudent(a);
    await enroll(a, course.id, [student.id]);

    const missingCourse = await call("/api/courses/00000000-0000-7000-8000-000000000000/students", {
      cookie: b.cookie,
    });
    const foreignRoster = await roster(b, course.id);
    expect(foreignRoster.status).toBe(404);
    expect(foreignRoster.json.error.message).toBe(missingCourse.json.error.message);
    expect((await enroll(b, course.id, [student.id])).status).toBe(404);
    expect((await setStatus(b, course.id, student.id, "dropped")).status).toBe(404);
    expect((await call(`/api/students/${student.id}/courses`, { cookie: b.cookie })).status).toBe(404);

    expect((await roster(a, course.id)).json.students[0].status).toBe("active");
  });

  it("cannot put another teacher's student into my own course (they look like they do not exist)", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    const foreignStudent = await addStudent(a);
    const myCourse = await createCourse(b);
    const res = await enroll(b, myCourse.id, [foreignStudent.id]);
    expect(outcomes(res)).toEqual(["not_found"]);
    expect((await roster(b, myCourse.id)).json.students).toEqual([]);
  });

  it("the database itself refuses a row that mixes two tenants", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    const course = await createCourse(a);
    const foreignStudent = await addStudent(b);
    const now = new Date().toISOString();
    const raw = (tenantId: string) =>
      env.DB.prepare(
        "INSERT INTO enrollments (id, tenant_id, course_id, student_id, status, enrolled_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
      )
        .bind(crypto.randomUUID(), tenantId, course.id, foreignStudent.id, now, now, now)
        .run();
    await expect(raw(a.tenantId)).rejects.toThrow(/one tenant/);
    await expect(raw(b.tenantId)).rejects.toThrow(/one tenant/);
  });

  it("the seat count of one teacher's course ignores everyone else's data", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const courseA = await createCourse(a, { maxStudents: 1 });
    const courseB = await createCourse(b, { maxStudents: 1 });
    await enroll(a, courseA.id, [(await addStudent(a)).id]);
    expect(outcomes(await enroll(b, courseB.id, [(await addStudent(b)).id]))).toEqual(["enrolled"]);
  });
});
