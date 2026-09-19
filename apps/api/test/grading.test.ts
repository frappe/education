import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  findSubmission,
  gradeStatement,
  requestRevisionStatement,
  returnStatement,
  rosterOf,
} from "../src/repos/grading";
import { addStudent, call, createCourse, createStudent, createTeacher, type Person } from "./helpers";

const body = (over: Record<string, unknown> = {}) => ({
  type: "essay",
  title: "My weekend",
  instructions: "Write 100 words.",
  questions: [],
  links: [],
  dueDate: "2099-01-10",
  dueTime: "18:00",
  allowLate: false,
  maxScore: 10,
  targetMode: "all",
  studentIds: [],
  ...over,
});
const answer = (over: Record<string, unknown> = {}) => ({
  textAnswer: "I played football.",
  linkUrl: null,
  answers: [],
  ...over,
});
const setSql = (sql: string, ...args: unknown[]) =>
  env.DB.prepare(sql)
    .bind(...args)
    .run();
const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;

type Kid = Person & { studentId: string };
async function joinedKid(t: Person, courseId: string, name = "Kid"): Promise<Kid> {
  const kid = await createStudent(t, name);
  const all = (await call("/api/students?page=1", { cookie: t.cookie })).json.students as {
    id: string;
    email: string;
  }[];
  const studentId = all.find((s) => s.email === kid.email)!.id;
  await call(`/api/courses/${courseId}/students`, {
    method: "POST",
    cookie: t.cookie,
    body: { studentIds: [studentId], customPrice: null },
  });
  return { ...kid, studentId };
}
async function publish(t: Person, courseId: string, over: Record<string, unknown> = {}) {
  const made = await call(`/api/courses/${courseId}/assignments`, {
    method: "POST",
    cookie: t.cookie,
    body: body(over),
  });
  expect(made.status, JSON.stringify(made.json)).toBe(201);
  await call(`/api/assignments/${made.json.assignment.id}/publish`, {
    method: "POST",
    cookie: t.cookie,
    body: {},
  });
  return made.json.assignment.id as string;
}
const handIn = (kid: Person, id: string, over: Record<string, unknown> = {}) =>
  call(`/api/my/work/${id}/submit`, { method: "POST", cookie: kid.cookie, body: answer(over) });
const myWork = async (kid: Person, id: string) =>
  (await call(`/api/my/work/${id}`, { cookie: kid.cookie })).json.work;

const base = (id: string, studentId: string) => `/api/assignments/${id}/submissions/${studentId}`;
const list = async (t: Person, id: string) =>
  (await call(`/api/assignments/${id}/submissions`, { cookie: t.cookie })).json.submissions as {
    studentId: string;
    studentName: string;
    status: string;
    score: number | null;
    version: number | null;
    extensionUntil: string | null;
    isLate: boolean;
  }[];
const open = async (t: Person, id: string, studentId: string) =>
  (await call(base(id, studentId), { cookie: t.cookie })).json.submission;
const grade = (t: Person, id: string, studentId: string, over: Record<string, unknown>) =>
  call(`${base(id, studentId)}/grade`, {
    method: "PUT",
    cookie: t.cookie,
    body: { score: 8, feedback: "Good work", version: 1, ...over },
  });
const giveBack = (t: Person, id: string, studentId: string, version: number) =>
  call(`${base(id, studentId)}/return`, { method: "POST", cookie: t.cookie, body: { version } });
const again = (t: Person, id: string, studentId: string, over: Record<string, unknown>) =>
  call(`${base(id, studentId)}/request-revision`, {
    method: "POST",
    cookie: t.cookie,
    body: { feedback: "Add more detail", version: 1, ...over },
  });

/** A teacher, a course, two students who joined it, and one piece of essay work. */
async function setup(over: Record<string, unknown> = {}) {
  const t = await createTeacher("Lan Tran");
  const course = await createCourse(t, { maxStudents: null });
  const hoa = await joinedKid(t, course.id, "Hoa");
  const nam = await joinedKid(t, course.id, "Nam");
  const id = await publish(t, course.id, over);
  return { t, course, hoa, nam, id };
}

describe("the list of answers for a piece of work", () => {
  it("shows every student it is for, waiting answers first, and hides drafts", async () => {
    const { t, course, hoa, nam, id } = await setup();
    const chi = await joinedKid(t, course.id, "Chi");
    await handIn(hoa, id);
    await call(`/api/my/work/${id}/draft`, { method: "PUT", cookie: nam.cookie, body: answer() }); // only a draft
    const rows = await list(t, id);
    expect(rows.map((r) => [r.studentName, r.status])).toEqual([
      ["Hoa", "submitted"],
      ["Chi", "not_started"],
      ["Nam", "not_started"], // the draft is not shown to the teacher
    ]);
    void chi;
  });

  it("shows only the chosen students for work given to some", async () => {
    const { t, course, hoa } = await setup();
    const nam = await joinedKid(t, course.id, "Nam");
    const id = await publish(t, course.id, { targetMode: "selected", studentIds: [nam.studentId] });
    expect((await list(t, id)).map((r) => r.studentName)).toEqual(["Nam"]);
    void hoa;
  });

  it("keeps showing a student who handed in and left the course later", async () => {
    const { t, course, hoa, id } = await setup();
    await handIn(hoa, id);
    await call(`/api/courses/${course.id}/students/${hoa.studentId}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { status: "dropped", customPrice: null },
    });
    expect((await list(t, id)).map((r) => r.studentName)).toContain("Hoa");
  });

  it("answers 'not found' for another teacher's work", async () => {
    const { id } = await setup();
    const other = await createTeacher();
    expect((await call(`/api/assignments/${id}/submissions`, { cookie: other.cookie })).status).toBe(404);
    expect((await call("/api/assignments/made-up/submissions", { cookie: other.cookie })).status).toBe(404);
  });
});

describe("opening one answer", () => {
  it("shows the text, link, chosen options and the work itself", async () => {
    const { t, course, hoa } = await setup();
    const quiz = await publish(t, course.id, {
      type: "multiple_choice",
      title: "Quiz",
      questions: [
        { text: "Q1", options: ["a", "b", "c"] },
        { text: "Q2", options: ["x", "y"] },
      ],
    });
    await handIn(hoa, quiz, { textAnswer: "", answers: [2, 0] });
    const s = await open(t, quiz, hoa.studentId);
    expect(s).toMatchObject({
      studentName: "Hoa",
      status: "submitted",
      answer: { answers: [2, 0] },
      score: null,
      feedback: "",
      version: 1,
      history: [],
    });
    expect(s.assignment.questions).toHaveLength(2);
    const speak = await publish(t, course.id, { type: "speaking", title: "Talk" });
    await handIn(hoa, speak, { textAnswer: "My note", linkUrl: "https://youtu.be/abc" });
    expect((await open(t, speak, hoa.studentId)).answer).toMatchObject({
      textAnswer: "My note",
      linkUrl: "https://youtu.be/abc",
    });
  });

  it("is 'not found' when nothing was handed in, for a draft, and for another teacher", async () => {
    const { t, hoa, nam, id } = await setup();
    expect((await call(base(id, hoa.studentId), { cookie: t.cookie })).status).toBe(404);
    await call(`/api/my/work/${id}/draft`, { method: "PUT", cookie: nam.cookie, body: answer() });
    expect((await call(base(id, nam.studentId), { cookie: t.cookie })).status).toBe(404); // a draft is private to the student
    await handIn(hoa, id);
    const other = await createTeacher();
    expect((await call(base(id, hoa.studentId), { cookie: other.cookie })).status).toBe(404);
    expect(await findSubmission(env.DB, other.tenantId, id, hoa.studentId)).toBeNull(); // the query itself is scoped
  });
});

describe("scoring", () => {
  it("saves a score and feedback, and the student still sees nothing", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    const res = await grade(t, id, hoa.studentId, { score: 7.5, feedback: "Nice, watch the tenses." });
    expect(res.status).toBe(200);
    expect(res.json.submission).toMatchObject({
      status: "graded",
      score: 7.5,
      feedback: "Nice, watch the tenses.",
      version: 2,
    });
    expect(await myWork(hoa, id)).toMatchObject({
      status: "graded",
      score: null,
      feedback: "",
      canEdit: false,
    });
  });

  it("keeps the whole history of scores, newest first, with who and when", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { score: 6, feedback: "First", version: 1 });
    await grade(t, id, hoa.studentId, { score: 8, feedback: "Second", version: 2 });
    const s = await open(t, id, hoa.studentId);
    expect(
      s.history.map((h: { oldScore: number | null; newScore: number; by: string; feedback: string }) => [
        h.oldScore,
        h.newScore,
        h.by,
        h.feedback,
      ]),
    ).toEqual([
      [6, 8, "Lan Tran", "Second"],
      [null, 6, "Lan Tran", "First"],
    ]);
  });

  it("refuses scores that are too high, negative, or not in steps of 0.5", async () => {
    const { t, hoa, id } = await setup({ maxScore: 10 });
    await handIn(hoa, id);
    for (const score of [10.5, 11, -1, 7.3, 0.25, "8", null]) {
      const res = await grade(t, id, hoa.studentId, { score });
      expect(res.status, String(score)).toBe(400);
    }
    expect((await grade(t, id, hoa.studentId, { score: 10 })).status).toBe(200);
    expect((await grade(t, id, hoa.studentId, { score: 0, version: 2 })).status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM grade_revisions")).toBeGreaterThan(0);
  });

  it("uses the maximum of the work, not a fixed one", async () => {
    const { t, hoa, id } = await setup({ maxScore: 100 });
    await handIn(hoa, id);
    expect((await grade(t, id, hoa.studentId, { score: 95 })).status).toBe(200);
    const { id: small, hoa: kid2, t: t2 } = await setup({ maxScore: 5 });
    await handIn(kid2, small);
    expect((await grade(t2, small, kid2.studentId, { score: 6 })).status).toBe(400);
  });

  it("refuses a save when the answer changed since it was opened, and changes nothing", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { score: 6, feedback: "First", version: 1 });
    const stale = await grade(t, id, hoa.studentId, { score: 9, feedback: "From an old page", version: 1 });
    expect(stale.status).toBe(409);
    expect(
      await count("SELECT COUNT(*) AS n FROM grade_revisions WHERE new_feedback = 'From an old page'"),
    ).toBe(0);
    expect((await open(t, id, hoa.studentId)).score).toBe(6);
  });

  it("two scores at the same moment: one wins, and only one history line", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    const results = await Promise.all([
      grade(t, id, hoa.studentId, { score: 5, feedback: "A" }),
      grade(t, id, hoa.studentId, { score: 9, feedback: "B" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await open(t, id, hoa.studentId)).history).toHaveLength(1);
  });

  it("cannot score work that was not handed in, and cannot score another teacher's student", async () => {
    const { t, hoa, nam, id } = await setup();
    expect((await grade(t, id, nam.studentId, {})).status).toBe(404);
    await handIn(hoa, id);
    const other = await createTeacher();
    expect((await grade(other, id, hoa.studentId, {})).status).toBe(404);
    expect((await open(t, id, hoa.studentId)).score).toBeNull();
  });

  it("ignores a status, student or tenant sent in the body", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    const res = await grade(t, id, hoa.studentId, { status: "returned", tenantId: "x", studentId: "y" });
    expect(res.json.submission.status).toBe("graded");
  });
});

describe("returning work to the student", () => {
  it("needs a score first, and then the student sees score and feedback", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    expect((await giveBack(t, id, hoa.studentId, 1)).status).toBe(409); // not scored yet
    await grade(t, id, hoa.studentId, { score: 8, feedback: "Well done", version: 1 });
    const res = await giveBack(t, id, hoa.studentId, 2);
    expect(res.status).toBe(200);
    expect(res.json.submission.status).toBe("returned");
    expect(await myWork(hoa, id)).toMatchObject({ status: "returned", score: 8, feedback: "Well done" });
  });

  it("cannot be returned twice, or with an old version", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { version: 1 });
    expect((await giveBack(t, id, hoa.studentId, 1)).status).toBe(409); // old version
    expect((await giveBack(t, id, hoa.studentId, 2)).status).toBe(200);
    expect((await giveBack(t, id, hoa.studentId, 3)).status).toBe(409); // already returned
  });

  it("a change after returning shows to the student at once, and is kept in the history", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { score: 6, version: 1 });
    await giveBack(t, id, hoa.studentId, 2);
    const res = await grade(t, id, hoa.studentId, { score: 9, feedback: "I was too strict", version: 3 });
    expect(res.json.submission.status).toBe("returned");
    expect(await myWork(hoa, id)).toMatchObject({ score: 9, feedback: "I was too strict" });
    expect((await open(t, id, hoa.studentId)).history).toHaveLength(2);
  });

  it("only that teacher's work can be returned", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { version: 1 });
    const other = await createTeacher();
    expect((await giveBack(other, id, hoa.studentId, 2)).status).toBe(404);
    expect((await myWork(hoa, id)).status).toBe("graded");
  });
});

describe("asking the student to do it again", () => {
  it("shows the reason to the student, who can change the answer and hand in again", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id, { textAnswer: "Short" });
    expect(
      (await again(t, id, hoa.studentId, { feedback: "Write 100 words", version: 1 })).json.submission.status,
    ).toBe("revision_requested");
    const mine = await myWork(hoa, id);
    expect(mine).toMatchObject({
      status: "revision_requested",
      score: null,
      feedback: "Write 100 words",
      canEdit: true,
    });
    // the request is kept in the history too, even though the score did not change
    const kept = (await open(t, id, hoa.studentId)).history.map((h: { feedback: string }) => h.feedback);
    expect(kept).toEqual(["Write 100 words"]);
    const second = await handIn(hoa, id, { textAnswer: "A much longer answer" });
    expect(second.status).toBe(200);
    const s = await open(t, id, hoa.studentId);
    expect(s).toMatchObject({
      status: "submitted",
      revisionCount: 1,
      answer: { textAnswer: "A much longer answer" },
    });
  });

  it("needs a reason, works after scoring or returning, and not on closed work", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    expect((await again(t, id, hoa.studentId, { feedback: "  " })).status).toBe(400);
    await grade(t, id, hoa.studentId, { version: 1 });
    await giveBack(t, id, hoa.studentId, 2);
    expect((await again(t, id, hoa.studentId, { feedback: "Please redo", version: 3 })).status).toBe(200);
    const { t: t2, hoa: kid2, id: id2 } = await setup();
    await handIn(kid2, id2);
    await call(`/api/assignments/${id2}/close`, { method: "POST", cookie: t2.cookie, body: {} });
    expect((await again(t2, id2, kid2.studentId, {})).status).toBe(409);
  });

  it("refuses an old version and another teacher", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { version: 1 });
    expect((await again(t, id, hoa.studentId, { version: 1 })).status).toBe(409);
    const other = await createTeacher();
    expect((await again(other, id, hoa.studentId, { version: 2 })).status).toBe(404);
  });
});

describe("more time for one student", () => {
  const extend = (t: Person, id: string, studentId: string, over: Record<string, unknown> = {}) =>
    call(`/api/assignments/${id}/extensions/${studentId}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { date: "2099-02-01", time: "20:00", ...over },
    });

  it("gives more time after the deadline, and only to that student", async () => {
    const { t, hoa, nam, id } = await setup();
    await setSql(
      "UPDATE assignments SET due_at = ? WHERE id = ?",
      new Date(Date.now() - 3600_000).toISOString(),
      id,
    );
    expect((await handIn(hoa, id)).status).toBe(409);
    const res = await extend(t, id, hoa.studentId);
    expect(res.status).toBe(200);
    expect(
      res.json.submissions.find((r: { studentId: string }) => r.studentId === hoa.studentId).extensionUntil,
    ).toBe("2099-02-01T13:00:00.000Z");
    expect((await handIn(hoa, id)).status).toBe(200);
    expect((await handIn(nam, id)).status).toBe(409);
  });

  it("can be taken back", async () => {
    const { t, hoa, id } = await setup();
    await extend(t, id, hoa.studentId);
    const res = await call(`/api/assignments/${id}/extensions/${hoa.studentId}`, {
      method: "DELETE",
      cookie: t.cookie,
    });
    expect(res.status).toBe(200);
    expect(
      res.json.submissions.every((r: { extensionUntil: string | null }) => r.extensionUntil === null),
    ).toBe(true);
  });

  it("needs a time in the future, a real date, and a student who is part of the work", async () => {
    const { t, course, hoa, id } = await setup();
    expect((await extend(t, id, hoa.studentId, { date: "2020-01-01" })).status).toBe(400);
    expect((await extend(t, id, hoa.studentId, { date: "2099-02-30" })).status).toBe(400);
    expect((await extend(t, id, hoa.studentId, { time: "25:00" })).status).toBe(400);
    const outsider = await addStudent(t, { name: "Not in this course" }); // the teacher's own student, but not in the work
    expect((await extend(t, id, outsider.id)).status).toBe(404);
    expect((await extend(t, id, "made-up")).status).toBe(404);
    const draft = (
      await call(`/api/courses/${course.id}/assignments`, {
        method: "POST",
        cookie: t.cookie,
        body: body({ title: "Not yet" }),
      })
    ).json.assignment.id;
    expect((await extend(t, draft, hoa.studentId)).status).toBe(409);
  });

  it("only that teacher can give or take back time", async () => {
    const { t, hoa, id } = await setup();
    const other = await createTeacher();
    expect((await extend(other, id, hoa.studentId)).status).toBe(404);
    await extend(t, id, hoa.studentId);
    expect(
      (
        await call(`/api/assignments/${id}/extensions/${hoa.studentId}`, {
          method: "DELETE",
          cookie: other.cookie,
        })
      ).status,
    ).toBe(404);
    expect((await list(t, id)).find((r) => r.studentId === hoa.studentId)!.extensionUntil).not.toBeNull();
  });
});

describe("the queue of work to score", () => {
  it("lists work waiting for a score across courses, the oldest first", async () => {
    const t = await createTeacher();
    const c1 = await createCourse(t, { maxStudents: null, name: "English A" });
    const c2 = await createCourse(t, { maxStudents: null, name: "English B" });
    const hoa = await joinedKid(t, c1.id, "Hoa");
    const nam = await joinedKid(t, c2.id, "Nam");
    const a1 = await publish(t, c1.id, { title: "First" });
    const a2 = await publish(t, c2.id, { title: "Second" });
    await handIn(nam, a2);
    await new Promise((r) => setTimeout(r, 5));
    await handIn(hoa, a1);
    const q = (await call("/api/grading/queue", { cookie: t.cookie })).json.queue;
    expect(
      q.map((i: { studentName: string; assignmentTitle: string; courseName: string }) => [
        i.studentName,
        i.assignmentTitle,
        i.courseName,
      ]),
    ).toEqual([
      ["Nam", "Second", "English B"],
      ["Hoa", "First", "English A"],
    ]);
    await grade(t, a2, nam.studentId, { version: 1 });
    expect((await call("/api/grading/queue", { cookie: t.cookie })).json.queue).toHaveLength(1);
  });

  it("never shows another teacher's work", async () => {
    const { hoa, id } = await setup();
    await handIn(hoa, id);
    const other = await createTeacher();
    expect((await call("/api/grading/queue", { cookie: other.cookie })).json.queue).toEqual([]);
  });
});

describe("the queries themselves keep to their rules, even when called directly", () => {
  it("the list of students stays inside one teacher's data", async () => {
    const { t, course, hoa, id } = await setup();
    await handIn(hoa, id);
    const other = await createTeacher();
    expect(await rosterOf(env.DB, other.tenantId, id, course.id, "all")).toEqual([]);
    expect((await rosterOf(env.DB, t.tenantId, id, course.id, "all")).length).toBeGreaterThan(0);
  });

  it("a draft cannot be scored, returned or sent back", async () => {
    const { t, hoa, id } = await setup();
    await call(`/api/my/work/${id}/draft`, { method: "PUT", cookie: hoa.cookie, body: answer() });
    const w = { tenantId: t.tenantId, assignmentId: id, studentId: hoa.studentId, version: 1 };
    expect(
      (await gradeStatement(env.DB, { ...w, score: 5, feedback: "", graderId: t.userId }).run()).meta.changes,
    ).toBe(0);
    expect((await returnStatement(env.DB, w).run()).meta.changes).toBe(0);
    expect(
      (await requestRevisionStatement(env.DB, { ...w, feedback: "x", graderId: t.userId }).run()).meta
        .changes,
    ).toBe(0);
  });

  it("work without a score cannot be returned", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await setSql("UPDATE submissions SET status = 'graded', score = NULL WHERE assignment_id = ?", id);
    const res = await returnStatement(env.DB, {
      tenantId: t.tenantId,
      assignmentId: id,
      studentId: hoa.studentId,
      version: 1,
    }).run();
    expect(res.meta.changes).toBe(0);
  });

  it("an old version cannot be scored", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { version: 1 });
    const res = await gradeStatement(env.DB, {
      tenantId: t.tenantId,
      assignmentId: id,
      studentId: hoa.studentId,
      version: 1,
      score: 1,
      feedback: "",
      graderId: t.userId,
    }).run();
    expect(res.meta.changes).toBe(0);
  });
});

describe("the audit log and who may grade", () => {
  it("writes each step to the audit log", async () => {
    const { t, hoa, id } = await setup();
    await handIn(hoa, id);
    await grade(t, id, hoa.studentId, { version: 1 });
    await giveBack(t, id, hoa.studentId, 2);
    await again(t, id, hoa.studentId, { version: 3 });
    const rows = await env.DB.prepare(
      "SELECT action FROM audit_log WHERE tenant_id = ? AND action LIKE 'submission.%' ORDER BY at, id",
    )
      .bind(t.tenantId)
      .all<{ action: string }>();
    expect(rows.results.map((r) => r.action)).toEqual([
      "submission.handed_in",
      "submission.graded",
      "submission.returned",
      "submission.revision_requested",
    ]);
  });

  it("a student gets 403 on every grading route, and a signed out person 401", async () => {
    const { t, hoa, id } = await setup();
    const routes: [string, string, unknown?][] = [
      ["GET", "/api/grading/queue"],
      ["GET", `/api/assignments/${id}/submissions`],
      ["GET", base(id, hoa.studentId)],
      ["PUT", `${base(id, hoa.studentId)}/grade`, { score: 5, feedback: "", version: 1 }],
      ["POST", `${base(id, hoa.studentId)}/return`, { version: 1 }],
      ["POST", `${base(id, hoa.studentId)}/request-revision`, { feedback: "x", version: 1 }],
      ["PUT", `/api/assignments/${id}/extensions/${hoa.studentId}`, { date: "2099-02-01", time: "20:00" }],
      ["DELETE", `/api/assignments/${id}/extensions/${hoa.studentId}`],
    ];
    for (const [method, path, payload] of routes) {
      expect(
        (await call(path, { method, cookie: hoa.cookie, body: payload })).status,
        `${method} ${path}`,
      ).toBe(403);
      expect((await call(path, { method, body: payload })).status, `${method} ${path}`).toBe(401);
    }
    void t;
  });
});
