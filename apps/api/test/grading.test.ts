import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  findSubmission,
  gradeStatement,
  requestRevisionStatement,
  returnStatement,
  rosterOf,
} from "../src/repos/grading";
import { addStudent, call, createCourse, createTeacher, type Person } from "./helpers";
import {
  a,
  choice,
  draft,
  fullAnswers,
  homework,
  joinedKid,
  mixed,
  myWorkDetail,
  publish,
  quiz,
  submit,
  written,
} from "./homework";

const setSql = (sql: string, ...args: unknown[]) =>
  env.DB.prepare(sql)
    .bind(...args)
    .run();
const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;

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
const grade = (t: Person, id: string, studentId: string, over: Record<string, unknown> = {}) =>
  call(`${base(id, studentId)}/grade`, {
    method: "PUT",
    cookie: t.cookie,
    body: { points: {}, feedback: "Good work", version: 1, ...over },
  });
const giveBack = (t: Person, id: string, studentId: string, version: number) =>
  call(`${base(id, studentId)}/return`, { method: "POST", cookie: t.cookie, body: { version } });
const again = (t: Person, id: string, studentId: string, over: Record<string, unknown> = {}) =>
  call(`${base(id, studentId)}/request-revision`, {
    method: "POST",
    cookie: t.cookie,
    body: { feedback: "Add more detail", version: 1, ...over },
  });

/** Points by question number (1 is the first question), for the questions the teacher scores in `mixed()`. */
const pointsOf = (qs: { id: string }[], byNumber: Record<number, number>) =>
  Object.fromEntries(Object.entries(byNumber).map(([n, p]) => [qs[Number(n) - 1]!.id, p]));

/** A teacher, a course, two students who joined it, and a mixed homework that is open. */
async function setup(body: Record<string, unknown> = mixed()) {
  const t = await createTeacher("Lan Tran");
  const course = await createCourse(t, { maxStudents: null });
  const hoa = await joinedKid(t, course.id, "Hoa");
  const nam = await joinedKid(t, course.id, "Nam");
  const w = await publish(t, course.id, body);
  return { t, course, hoa, nam, id: w.id, qs: w.questions };
}
/** Hoa hands in a full answer (the scored questions right, apart from the short one). */
const handIn = (kid: Person, id: string, qs: Parameters<typeof fullAnswers>[0]) =>
  submit(kid, id, fullAnswers(qs));

describe("the list of answers for a piece of work", () => {
  it("shows every student it is for, waiting answers first, and hides drafts", async () => {
    const { t, course, hoa, nam, id, qs } = await setup();
    await joinedKid(t, course.id, "Chi");
    await handIn(hoa, id, qs);
    await draft(nam, id, [a.text(qs[2]!.id, "only a draft")]);
    expect((await list(t, id)).map((r) => [r.studentName, r.status])).toEqual([
      ["Hoa", "submitted"],
      ["Chi", "not_started"],
      ["Nam", "not_started"],
    ]);
  });

  it("shows a quiz that was scored by the system as returned, without work for the teacher", async () => {
    const { t, hoa, id, qs } = await setup(quiz());
    await submit(hoa, id, [a.choice(qs[0]!.id, 1), a.choice(qs[1]!.id, 1), a.text(qs[2]!.id, "went")]);
    expect((await list(t, id)).find((r) => r.studentName === "Hoa")).toMatchObject({
      status: "returned",
      score: 5,
    });
  });

  it("shows only the chosen students for work given to some", async () => {
    const { t, course } = await setup();
    const nam = await joinedKid(t, course.id, "Zed");
    const w = await publish(t, course.id, homework({ targetMode: "selected", studentIds: [nam.studentId] }));
    expect((await list(t, w.id)).map((r) => r.studentName)).toEqual(["Zed"]);
  });

  it("keeps showing a student who handed in and left the course later", async () => {
    const { t, course, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
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
  it("shows every answer, which questions the system scored, and the points it gave", async () => {
    const { t, hoa, id, qs } = await setup();
    const [c, s, w, v] = qs.map((q) => q.id) as [string, string, string, string];
    await submit(hoa, id, [
      a.choice(c, 2),
      a.text(s, "perro"),
      a.text(w, "My family is small."),
      a.video(v, "https://youtu.be/hi", "hello"),
    ]);
    const d = await open(t, id, hoa.studentId);
    expect(d).toMatchObject({
      studentName: "Hoa",
      status: "submitted",
      score: null,
      feedback: "",
      version: 1,
      history: [],
      revisionCount: 0,
    });
    expect(d.answers).toEqual([
      { questionId: c, choice: 2, text: "", link: null },
      { questionId: s, choice: null, text: "perro", link: null },
      { questionId: w, choice: null, text: "My family is small.", link: null },
      { questionId: v, choice: null, text: "hello", link: "https://youtu.be/hi" },
    ]);
    expect(d.perQuestion).toEqual([
      { questionId: c, auto: true, correct: true },
      { questionId: s, auto: true, correct: false },
      { questionId: w, auto: false, correct: null },
      { questionId: v, auto: false, correct: null },
    ]);
    expect(d.points).toEqual({ [c]: 2, [s]: 0 }); // only what the system scored so far
    expect(d.assignment.questions[0]).toMatchObject({ correct: 2 }); // the teacher sees the answer key
  });

  it("is 'not found' when nothing was handed in, for a draft, and for another teacher", async () => {
    const { t, hoa, nam, id, qs } = await setup();
    expect((await call(base(id, hoa.studentId), { cookie: t.cookie })).status).toBe(404);
    await draft(nam, id, [a.text(qs[2]!.id, "x")]);
    expect((await call(base(id, nam.studentId), { cookie: t.cookie })).status).toBe(404);
    await handIn(hoa, id, qs);
    const other = await createTeacher();
    expect((await call(base(id, hoa.studentId), { cookie: other.cookie })).status).toBe(404);
    expect(await findSubmission(env.DB, other.tenantId, id, hoa.studentId)).toBeNull();
  });
});

describe("scoring the questions the teacher scores", () => {
  it("adds the points of the teacher to the points of the system, and the student still sees nothing of it", async () => {
    const { t, hoa, id, qs } = await setup(); // choice 2, short 3, written 5, speaking 5
    await handIn(hoa, id, qs); // choice right (2), short right (3): 5 from the system
    const res = await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 4, 4: 4.5 }),
      feedback: "Nice.",
    });
    expect(res.status).toBe(200);
    expect(res.json.submission).toMatchObject({
      status: "graded",
      score: 13.5,
      feedback: "Nice.",
      version: 2,
    });
    expect(res.json.submission.points).toEqual(pointsOf(qs, { 1: 2, 2: 3, 3: 4, 4: 4.5 }));
    const student = (await myWorkDetail(hoa, id)).json.work;
    expect(student).toMatchObject({ status: "graded", score: null, feedback: "" });
    expect(student.results.perQuestion.slice(2).map((r: { awarded: number | null }) => r.awarded)).toEqual([
      null,
      null,
    ]);
  });

  it("the student sees every point once it is returned", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 5 }), feedback: "Well done" });
    expect((await giveBack(t, id, hoa.studentId, 2)).status).toBe(200);
    const work = (await myWorkDetail(hoa, id)).json.work;
    expect(work).toMatchObject({ status: "returned", score: 14, feedback: "Well done" });
    expect(work.results.perQuestion.map((r: { awarded: number }) => r.awarded)).toEqual([2, 3, 4, 5]);
  });

  it("the points of a question the system scored cannot be changed, but the same points are fine and are ignored when left out", async () => {
    const { t, hoa, id, qs } = await setup();
    await submit(hoa, id, [
      a.choice(qs[0]!.id, 2),
      a.text(qs[1]!.id, "gatto"),
      a.text(qs[2]!.id, "x"),
      a.video(qs[3]!.id, "https://youtu.be/a"),
    ]); // a typo: the system gave 0 for the short question
    for (const [n, p] of [
      [2, 2.5],
      [1, 0],
    ] as const) {
      const res = await grade(t, id, hoa.studentId, { points: pointsOf(qs, { [n]: p, 3: 5, 4: 5 }) });
      expect(res.status).toBe(400);
      expect(res.json.error.fields.points).toMatch(new RegExp(`^Question ${n}: the system scored`));
    }
    expect((await open(t, id, hoa.studentId)).version).toBe(1); // nothing was saved
    const same = await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 1: 2, 2: 0, 3: 5, 4: 5 }) });
    expect(same.status).toBe(200);
    expect(same.json.submission.points[qs[1]!.id]).toBe(0);
    expect(same.json.submission.score).toBe(12);
  });

  it("asks for points for every question the system did not score", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    const res = await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4 }) });
    expect(res.status).toBe(400);
    expect(res.json.error.fields.points).toMatch(/^Question 4: /);
    expect((await open(t, id, hoa.studentId)).status).toBe("submitted");
    expect(
      await count(
        "SELECT COUNT(*) AS n FROM grade_revisions r JOIN submissions s ON s.id = r.submission_id WHERE s.assignment_id = ?",
        id,
      ),
    ).toBe(0);
  });

  it("refuses points above the most for a question, negative, not in halves, or for an unknown question", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    const ok = pointsOf(qs, { 3: 4, 4: 4 });
    const bad: [string, Record<string, unknown>, string][] = [
      ["more than the question", { ...ok, [qs[2]!.id]: 5.5 }, "points"],
      ["negative points", { ...ok, [qs[2]!.id]: -1 }, "points"],
      ["points that are not halves", { ...ok, [qs[2]!.id]: 3.3 }, "points"],
      ["not a number", { ...ok, [qs[2]!.id]: "4" }, "points"],
      ["an unknown question", { ...ok, q_other: 1 }, "points"],
    ];
    for (const [label, points, field] of bad) {
      const res = await grade(t, id, hoa.studentId, { points });
      expect(res.status, label).toBe(400);
      expect(
        Object.keys(res.json.error.fields).some((k) => k.startsWith(field)),
        label,
      ).toBe(true);
    }
    expect((await open(t, id, hoa.studentId)).status).toBe("submitted");
    expect((await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 5, 4: 5 }) })).status).toBe(200); // the most is fine
  });

  it("keeps the whole history of scores, newest first, with who and when", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 2, 4: 2 }),
      feedback: "First",
      version: 1,
    });
    await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 5, 4: 5 }),
      feedback: "Second",
      version: 2,
    });
    const s = await open(t, id, hoa.studentId);
    expect(
      s.history.map((h: { oldScore: number | null; newScore: number; by: string; feedback: string }) => [
        h.oldScore,
        h.newScore,
        h.by,
        h.feedback,
      ]),
    ).toEqual([
      [9, 15, "Lan Tran", "Second"],
      [null, 9, "Lan Tran", "First"],
    ]);
  });

  it("refuses a save when the answer changed since it was opened, and changes nothing", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 2, 4: 2 }),
      feedback: "First",
      version: 1,
    });
    const stale = await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 5, 4: 5 }),
      feedback: "From an old page",
      version: 1,
    });
    expect(stale.status).toBe(409);
    expect(
      await count("SELECT COUNT(*) AS n FROM grade_revisions WHERE new_feedback = 'From an old page'"),
    ).toBe(0);
    expect((await open(t, id, hoa.studentId)).score).toBe(9);
  });

  it("two scores at the same moment: one wins, and only one history line", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    const results = await Promise.all([
      grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 1, 4: 1 }), feedback: "A" }),
      grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 5, 4: 5 }), feedback: "B" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await open(t, id, hoa.studentId)).history).toHaveLength(1);
  });

  it("cannot score work that was not handed in, and cannot score another teacher's student", async () => {
    const { t, hoa, nam, id, qs } = await setup();
    expect((await grade(t, id, nam.studentId, { points: pointsOf(qs, { 3: 1, 4: 1 }) })).status).toBe(404);
    await handIn(hoa, id, qs);
    const other = await createTeacher();
    expect((await grade(other, id, hoa.studentId, { points: pointsOf(qs, { 3: 1, 4: 1 }) })).status).toBe(
      404,
    );
    expect((await open(t, id, hoa.studentId)).score).toBeNull();
  });

  it("ignores a status, student, tenant or total sent in the body", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    const res = await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 1, 4: 1 }),
      status: "returned",
      tenantId: "x",
      studentId: "y",
      score: 99,
    });
    expect(res.json.submission).toMatchObject({ status: "graded", score: 7 });
  });
});

describe("a comment or a correction on each question", () => {
  it("is kept with the answer, comes back when the answer is opened, and is empty at first", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    expect((await open(t, id, hoa.studentId)).notes).toEqual({});
    const res = await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 4, 4: 5 }),
      notes: { [qs[2]!.id]: "  'have' not 'has': My family has...  ", [qs[3]!.id]: "Speak slower." },
    });
    expect(res.status).toBe(200);
    expect(res.json.submission.notes).toEqual({
      [qs[2]!.id]: "'have' not 'has': My family has...",
      [qs[3]!.id]: "Speak slower.",
    });
    expect((await open(t, id, hoa.studentId)).notes).toEqual(res.json.submission.notes);
  });

  it("a save replaces the comments: empty ones are dropped, and a comment can be written on a question the system scored", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 4, 4: 5 }),
      notes: { [qs[0]!.id]: "Good", [qs[2]!.id]: "Fix this" },
    });
    const res = await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 4, 4: 5 }),
      notes: { [qs[0]!.id]: "", [qs[1]!.id]: "Check the spelling" },
      version: 2,
    });
    expect(res.json.submission.notes).toEqual({ [qs[1]!.id]: "Check the spelling" });
  });

  it("refuses a comment for a question that is not in this homework, or one that is too long, and changes nothing", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    const points = pointsOf(qs, { 3: 4, 4: 5 });
    const other = await grade(t, id, hoa.studentId, { points, notes: { q_unknown: "x" } });
    expect(other.status).toBe(400);
    expect(other.json.error.fields.notes).toMatch(/not for a question/);
    const long = await grade(t, id, hoa.studentId, { points, notes: { [qs[2]!.id]: "x".repeat(2001) } });
    expect(long.status).toBe(400);
    expect((await open(t, id, hoa.studentId)).version).toBe(1);
  });

  it("the student sees the comments only once the work is returned", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 4, 4: 5 }),
      notes: { [qs[2]!.id]: "Fix the verb" },
    });
    const before = await myWorkDetail(hoa, id);
    expect(JSON.stringify(before.json.work)).not.toContain("Fix the verb");
    await giveBack(t, id, hoa.studentId, 2);
    const notes = (await myWorkDetail(hoa, id)).json.work.results.perQuestion.map(
      (r: { note: string }) => r.note,
    );
    expect(notes).toEqual(["", "", "Fix the verb", ""]);
  });

  it("a comment added after returning shows to the student at once", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 5 }) });
    await giveBack(t, id, hoa.studentId, 2);
    await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 4, 4: 5 }),
      notes: { [qs[0]!.id]: "Nice" },
      version: 3,
    });
    const notes = (await myWorkDetail(hoa, id)).json.work.results.perQuestion.map(
      (r: { note: string }) => r.note,
    );
    expect(notes[0]).toBe("Nice");
  });

  it("another teacher cannot read or write the comments", async () => {
    const { hoa, id, qs } = await setup();
    const other = await createTeacher("Other");
    const res = await grade(other, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 1, 4: 1 }),
      notes: { [qs[2]!.id]: "x" },
    });
    expect(res.status).toBe(404);
  });
});

describe("a quiz the system scored", () => {
  it("keeps the score of the system, while the teacher can still add feedback and comments that the student sees at once", async () => {
    const { t, hoa, id, qs } = await setup(quiz()); // 2 + 1 + 2 = 5
    await submit(hoa, id, [a.choice(qs[0]!.id, 1), a.choice(qs[1]!.id, 0), a.text(qs[2]!.id, "goed")]); // 2 right of 5
    expect((await myWorkDetail(hoa, id)).json.work.score).toBe(2);
    const changed = await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 2 }), version: 1 });
    expect(changed.status).toBe(400);
    expect((await myWorkDetail(hoa, id)).json.work.score).toBe(2);
    const res = await grade(t, id, hoa.studentId, {
      points: {},
      feedback: "Review the past tense",
      notes: { [qs[2]!.id]: "'went' is the past of 'go'" },
      version: 1,
    });
    expect(res.status).toBe(200);
    expect(res.json.submission).toMatchObject({ status: "returned", score: 2 });
    const work = (await myWorkDetail(hoa, id)).json.work;
    expect(work).toMatchObject({ score: 2, feedback: "Review the past tense" });
    expect(work.results.perQuestion[2].note).toBe("'went' is the past of 'go'");
  });
});

describe("returning work to the student", () => {
  it("needs a score first, and cannot be returned twice or with an old version", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    expect((await giveBack(t, id, hoa.studentId, 1)).status).toBe(409); // not scored yet
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 4 }), version: 1 });
    expect((await giveBack(t, id, hoa.studentId, 1)).status).toBe(409); // old version
    expect((await giveBack(t, id, hoa.studentId, 2)).status).toBe(200);
    expect((await giveBack(t, id, hoa.studentId, 3)).status).toBe(409); // already returned
  });

  it("a change after returning shows to the student at once, and is kept in the history", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 1, 4: 1 }), version: 1 });
    await giveBack(t, id, hoa.studentId, 2);
    const res = await grade(t, id, hoa.studentId, {
      points: pointsOf(qs, { 3: 5, 4: 5 }),
      feedback: "I was too strict",
      version: 3,
    });
    expect(res.json.submission.status).toBe("returned");
    expect((await myWorkDetail(hoa, id)).json.work).toMatchObject({
      score: 15,
      feedback: "I was too strict",
    });
    expect((await open(t, id, hoa.studentId)).history).toHaveLength(2);
  });

  it("only that teacher's work can be returned", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 4 }), version: 1 });
    const other = await createTeacher();
    expect((await giveBack(other, id, hoa.studentId, 2)).status).toBe(404);
    expect((await myWorkDetail(hoa, id)).json.work.status).toBe("graded");
  });
});

describe("asking the student to do it again", () => {
  it("shows the reason to the student, who can change the answer and hand in again", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    expect(
      (await again(t, id, hoa.studentId, { feedback: "Write more", version: 1 })).json.submission.status,
    ).toBe("revision_requested");
    expect((await myWorkDetail(hoa, id)).json.work).toMatchObject({
      status: "revision_requested",
      score: null,
      feedback: "Write more",
      canEdit: true,
    });
    expect((await open(t, id, hoa.studentId)).history.map((h: { feedback: string }) => h.feedback)).toEqual([
      "Write more",
    ]); // the request is kept too
    expect((await handIn(hoa, id, qs)).status).toBe(200);
    expect(await open(t, id, hoa.studentId)).toMatchObject({ status: "submitted", revisionCount: 1 });
  });

  it("needs a reason, works after scoring or returning, and not on closed work", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    expect((await again(t, id, hoa.studentId, { feedback: "  " })).status).toBe(400);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 4 }), version: 1 });
    await giveBack(t, id, hoa.studentId, 2);
    expect((await again(t, id, hoa.studentId, { feedback: "Please redo", version: 3 })).status).toBe(200);
    const { t: t2, hoa: kid2, id: id2, qs: qs2 } = await setup();
    await handIn(kid2, id2, qs2);
    await call(`/api/assignments/${id2}/close`, { method: "POST", cookie: t2.cookie, body: {} });
    expect((await again(t2, id2, kid2.studentId)).status).toBe(409);
  });

  it("refuses an old version and another teacher", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 4 }), version: 1 });
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
    const { t, hoa, nam, id, qs } = await setup();
    await setSql(
      "UPDATE assignments SET due_at = ? WHERE id = ?",
      new Date(Date.now() - 3600_000).toISOString(),
      id,
    );
    expect((await handIn(hoa, id, qs)).status).toBe(409);
    const res = await extend(t, id, hoa.studentId);
    expect(res.status).toBe(200);
    expect(
      res.json.submissions.find((r: { studentId: string }) => r.studentId === hoa.studentId).extensionUntil,
    ).toBe("2099-02-01T13:00:00.000Z");
    expect((await handIn(hoa, id, qs)).status).toBe(200);
    expect((await handIn(nam, id, qs)).status).toBe(409);
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
    const outsider = await addStudent(t, { name: "Not in this course" });
    expect((await extend(t, id, outsider.id)).status).toBe(404);
    expect((await extend(t, id, "made-up")).status).toBe(404);
    const draftWork = (
      await call(`/api/courses/${course.id}/assignments`, {
        method: "POST",
        cookie: t.cookie,
        body: homework({ title: "Not yet" }),
      })
    ).json.assignment.id;
    expect((await extend(t, draftWork, hoa.studentId)).status).toBe(409);
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
    const a1 = await publish(t, c1.id, homework({ title: "First" }));
    const a2 = await publish(t, c2.id, homework({ title: "Second" }));
    await handIn(nam, a2.id, a2.questions);
    await new Promise((r) => setTimeout(r, 5));
    await handIn(hoa, a1.id, a1.questions);
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
    await grade(t, a2.id, nam.studentId, { points: pointsOf(a2.questions, { 1: 10 }) });
    expect((await call("/api/grading/queue", { cookie: t.cookie })).json.queue).toHaveLength(1);
  });

  it("never shows another teacher's work", async () => {
    const { hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    const other = await createTeacher();
    expect((await call("/api/grading/queue", { cookie: other.cookie })).json.queue).toEqual([]);
  });
});

describe("the queries themselves keep to their rules, even when called directly", () => {
  const write = (t: Person, id: string, studentId: string, over: Record<string, unknown> = {}) => ({
    tenantId: t.tenantId,
    assignmentId: id,
    studentId,
    version: 1,
    score: 5,
    points: {},
    notes: {},
    feedback: "",
    graderId: t.userId,
    ...over,
  });

  it("the list of students stays inside one teacher's data", async () => {
    const { t, course, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    const other = await createTeacher();
    expect(await rosterOf(env.DB, other.tenantId, id, course.id, "all")).toEqual([]);
    expect((await rosterOf(env.DB, t.tenantId, id, course.id, "all")).length).toBeGreaterThan(0);
  });

  it("a draft cannot be scored, returned or sent back", async () => {
    const { t, hoa, id, qs } = await setup();
    await draft(hoa, id, [a.text(qs[2]!.id, "x")]);
    const w = write(t, id, hoa.studentId);
    expect((await gradeStatement(env.DB, w).run()).meta.changes).toBe(0);
    expect((await returnStatement(env.DB, w).run()).meta.changes).toBe(0);
    expect((await requestRevisionStatement(env.DB, { ...w, feedback: "x" }).run()).meta.changes).toBe(0);
  });

  it("work without a score cannot be returned", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await setSql("UPDATE submissions SET status = 'graded', score = NULL WHERE assignment_id = ?", id);
    expect((await returnStatement(env.DB, write(t, id, hoa.studentId)).run()).meta.changes).toBe(0);
  });

  it("an old version cannot be scored", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 4 }), version: 1 });
    expect((await gradeStatement(env.DB, write(t, id, hoa.studentId, { score: 1 })).run()).meta.changes).toBe(
      0,
    );
  });
});

describe("the audit log and who may grade", () => {
  it("writes each step to the audit log", async () => {
    const { t, hoa, id, qs } = await setup();
    await handIn(hoa, id, qs);
    await grade(t, id, hoa.studentId, { points: pointsOf(qs, { 3: 4, 4: 4 }), version: 1 });
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
    const { hoa, id } = await setup();
    const routes: [string, string, unknown?][] = [
      ["GET", "/api/grading/queue"],
      ["GET", `/api/assignments/${id}/submissions`],
      ["GET", base(id, hoa.studentId)],
      ["PUT", `${base(id, hoa.studentId)}/grade`, { points: {}, feedback: "", version: 1 }],
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
  });
});

void written;
void choice;
