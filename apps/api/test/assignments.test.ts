import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { findAssignment } from "../src/repos/assignments";
import { addStudent, call, createCourse, createStudent, createTeacher, type Person } from "./helpers";
import { choice, homework, mixed, quiz, short, speaking, written } from "./homework";

type A = {
  id: string;
  version: number;
  status: string;
  title: string;
  studentIds: string[];
  dueAt: string | null;
  dueDate: string | null;
  dueTime: string | null;
  maxScore: number;
  counts: { targeted: number; handedIn: number; toGrade: number };
  questions: {
    id: string;
    kind: string;
    text: string;
    points: number;
    options: string[];
    correct: number | null;
    accepted: string[];
  }[];
};

const create = (t: Person, courseId: string, body: Record<string, unknown> = homework()) =>
  call(`/api/courses/${courseId}/assignments`, { method: "POST", cookie: t.cookie, body });
const made = async (t: Person, courseId: string, body: Record<string, unknown> = homework()) => {
  const res = await create(t, courseId, body);
  expect(res.status, JSON.stringify(res.json)).toBe(201);
  return res.json.assignment as A;
};
const get = async (t: Person, id: string) =>
  (await call(`/api/assignments/${id}`, { cookie: t.cookie })).json.assignment as A;
/** Saves the same homework again with changes. The questions keep their ids, as the screen sends them. */
const update = (t: Person, a: A, over: Record<string, unknown> = {}) =>
  call(`/api/assignments/${a.id}`, {
    method: "PUT",
    cookie: t.cookie,
    body: { ...homework({ title: a.title, questions: a.questions }), version: a.version, ...over },
  });
const act = (t: Person, id: string, what: "publish" | "close") =>
  call(`/api/assignments/${id}/${what}`, { method: "POST", cookie: t.cookie, body: {} });
const enroll = (t: Person, courseId: string, ids: string[]) =>
  call(`/api/courses/${courseId}/students`, {
    method: "POST",
    cookie: t.cookie,
    body: { studentIds: ids, customPrice: null },
  });
const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;

async function setup() {
  const t = await createTeacher();
  const course = await createCourse(t, { maxStudents: null });
  const kids = [
    await addStudent(t, { name: "Anh" }),
    await addStudent(t, { name: "Bao" }),
    await addStudent(t, { name: "Chi" }),
  ];
  await enroll(
    t,
    course.id,
    kids.map((k) => k.id),
  );
  return { t, course, kids };
}
const hand = (tenantId: string, assignmentId: string, studentId: string, status = "submitted") =>
  env.DB.prepare(
    `INSERT INTO submissions (id, tenant_id, assignment_id, student_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'x', 'x')`,
  )
    .bind(crypto.randomUUID(), tenantId, assignmentId, studentId, status)
    .run();

describe("create a homework", () => {
  it("makes a draft, and shows the due time in the teacher's time zone", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    expect(a).toMatchObject({
      title: "My weekend",
      status: "draft",
      version: 1,
      dueDate: "2099-01-10",
      dueTime: "18:00",
      dueAt: "2099-01-10T11:00:00.000Z", // 7 hours behind Ho Chi Minh
      targetMode: "all",
      allowLate: false,
      maxScore: 10,
    });
    expect(a.counts).toEqual({ targeted: 3, handedIn: 0, toGrade: 0 });
  });

  it("can have no due date", async () => {
    const { t, course } = await setup();
    expect(await made(t, course.id, homework({ dueDate: null, dueTime: null }))).toMatchObject({
      dueAt: null,
      dueDate: null,
      dueTime: null,
    });
  });

  it("mixes the kinds of question, gives each an id, and adds the points up", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id, mixed());
    expect(a.questions.map((q) => [q.kind, q.points])).toEqual([
      ["choice", 2],
      ["short", 3],
      ["written", 5],
      ["speaking", 5],
    ]);
    expect(a.maxScore).toBe(15);
    const ids = a.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) expect(id).toMatch(/^q_[0-9a-f]{8}$/);
    expect(a.questions[0]).toMatchObject({ options: ["a", "b", "c"], correct: 2 });
    expect(a.questions[1]).toMatchObject({ accepted: ["gato"] });
  });

  it("counts half points", async () => {
    const { t, course } = await setup();
    const a = await made(
      t,
      course.id,
      homework({ questions: [choice("Q", ["a", "b"], 0, 1.5), written("W", 2)] }),
    );
    expect(a.maxScore).toBe(3.5);
  });

  it("keeps only what belongs to the kind of question", async () => {
    const { t, course } = await setup();
    const a = await made(
      t,
      course.id,
      homework({ questions: [{ ...short("S", ["x", "  "]), accepted: ["x", "  "] }] }),
    ).catch(() => null);
    expect(a).toBeNull(); // an empty accepted answer is refused, not silently dropped
    const ok = await made(t, course.id, homework({ questions: [short("S", ["x", "y"])] }));
    expect(ok.questions[0]).toMatchObject({ options: [], correct: null, accepted: ["x", "y"] });
  });

  it("can be for chosen students only, and counts them", async () => {
    const { t, course, kids } = await setup();
    const a = await made(
      t,
      course.id,
      homework({ targetMode: "selected", studentIds: [kids[0]!.id, kids[2]!.id] }),
    );
    expect(a.counts.targeted).toBe(2);
    expect([...(await get(t, a.id)).studentIds].sort()).toEqual([kids[0]!.id, kids[2]!.id].sort());
  });

  it("refuses bad input and says which field", async () => {
    const { t, course } = await setup();
    const bad: [string, Record<string, unknown>, string][] = [
      ["no title", { title: "  " }, "title"],
      ["a title that is too long", { title: "x".repeat(151) }, "title"],
      ["instructions that are too long", { instructions: "x".repeat(5001) }, "instructions"],
      ["no questions", { questions: [] }, "questions"],
      ["51 questions", { questions: Array.from({ length: 51 }, () => written("W", 1)) }, "questions"],
      ["a question with no words", { questions: [written("  ")] }, "questions"],
      ["a question with 0 points", { questions: [written("W", 0)] }, "questions"],
      ["a question with 101 points", { questions: [written("W", 101)] }, "questions"],
      ["points that are not halves", { questions: [written("W", 1.3)] }, "questions"],
      ["a choice question with one answer", { questions: [choice("Q", ["a"], 0)] }, "questions"],
      [
        "a choice question with 7 answers",
        { questions: [choice("Q", ["1", "2", "3", "4", "5", "6", "7"], 0)] },
        "questions",
      ],
      ["a choice question with an empty answer", { questions: [choice("Q", ["a", " "], 0)] }, "questions"],
      ["a correct answer that is not on the list", { questions: [choice("Q", ["a", "b"], 2)] }, "questions"],
      [
        "a written question with answers",
        { questions: [{ ...written(), options: ["a", "b"] }] },
        "questions",
      ],
      [
        "a written question with a correct answer",
        { questions: [{ ...written(), correct: 0 }] },
        "questions",
      ],
      [
        "accepted answers on a written question",
        { questions: [{ ...written(), accepted: ["x"] }] },
        "questions",
      ],
      [
        "11 accepted answers",
        {
          questions: [
            short(
              "S",
              Array.from({ length: 11 }, (_, i) => `a${i}`),
            ),
          ],
        },
        "questions",
      ],
      [
        "the same id twice",
        {
          questions: [
            { ...written("A"), id: "same" },
            { ...written("B"), id: "same" },
          ],
        },
        "questions",
      ],
      [
        "more than 1000 points",
        { questions: Array.from({ length: 11 }, () => written("W", 100)) },
        "questions",
      ],
      ["a day without a time", { dueTime: null }, "dueTime"],
      ["a time without a day", { dueDate: null }, "dueDate"],
      ["a date that does not exist", { dueDate: "2099-02-30" }, "dueDate"],
      ["a time like 6:30", { dueTime: "6:30" }, "dueTime"],
      ["chosen students but none chosen", { targetMode: "selected", studentIds: [] }, "studentIds"],
      ["a link that is not https", { links: [{ title: "x", url: "http://example.com" }] }, "links"],
      ["a link that runs code", { links: [{ title: "x", url: "javascript:alert(1)" }] }, "links"],
      ["a link with a password", { links: [{ title: "x", url: "https://a:b@example.com" }] }, "links"],
      [
        "11 links",
        { links: Array.from({ length: 11 }, () => ({ title: "x", url: "https://example.com" })) },
        "links",
      ],
    ];
    for (const [label, over, field] of bad) {
      const res = await create(t, course.id, homework(over));
      expect(res.status, label).toBe(400);
      expect(
        Object.keys(res.json.error.fields).some((k) => k.startsWith(field)),
        label,
      ).toBe(true);
    }
    expect(await count("SELECT COUNT(*) AS n FROM assignments WHERE course_id = ?", course.id)).toBe(0);
  });

  it("says which question has the problem", async () => {
    const { t, course } = await setup();
    const res = await create(t, course.id, homework({ questions: [written(), choice("Q", ["a"], 0)] }));
    expect(res.json.error.fields.questions).toMatch(/^Question 2: /);
  });

  it("refuses chosen students who are not in the course, of another teacher, or listed twice", async () => {
    const { t, course, kids } = await setup();
    const outside = await addStudent(t, { name: "Not in the course" });
    const other = await createTeacher();
    const foreign = await addStudent(other);
    for (const ids of [
      [outside.id],
      [foreign.id],
      ["made-up"],
      [kids[0]!.id, kids[0]!.id],
      [kids[0]!.id, outside.id],
    ]) {
      const res = await create(t, course.id, homework({ targetMode: "selected", studentIds: ids }));
      expect(res.status, JSON.stringify(ids)).toBe(400);
      expect(res.json.error.fields).toHaveProperty("studentIds");
    }
    await call(`/api/courses/${course.id}/students/${kids[1]!.id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { status: "dropped", customPrice: null },
    });
    expect(
      (await create(t, course.id, homework({ targetMode: "selected", studentIds: [kids[1]!.id] }))).status,
    ).toBe(400);
    expect(await count("SELECT COUNT(*) AS n FROM assignments WHERE course_id = ?", course.id)).toBe(0);
  });

  it("does not add work to an archived course or to another teacher's course", async () => {
    const { t, course } = await setup();
    const other = await createTeacher();
    expect((await create(other, course.id)).status).toBe(404);
    expect((await create(t, "made-up-id")).status).toBe(404);
    await call(`/api/courses/${course.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    expect((await create(t, course.id)).status).toBe(409);
  });

  it("ignores a tenant, kind or points total sent in the body, and writes to the audit log", async () => {
    const { t, course } = await setup();
    const other = await createTeacher();
    const a = await made(t, course.id, {
      ...homework(),
      tenantId: other.tenantId,
      maxScore: 999,
      type: "speaking",
    });
    expect(a.maxScore).toBe(10);
    expect(await count("SELECT COUNT(*) AS n FROM assignments WHERE tenant_id = ?", other.tenantId)).toBe(0);
    expect(
      await count(
        "SELECT COUNT(*) AS n FROM audit_log WHERE tenant_id = ? AND action = 'assignment.created'",
        t.tenantId,
      ),
    ).toBe(1);
  });

  it("keeps a summary of the kind, only for the record", async () => {
    const { t, course } = await setup();
    const kind = async (body: Record<string, unknown>) =>
      (await env.DB.prepare("SELECT type FROM assignments WHERE id = ?")
        .bind((await made(t, course.id, body)).id)
        .first<{ type: string }>())!.type;
    expect(
      await kind(homework({ questions: [choice("A", ["x", "y"], 0), choice("B", ["x", "y"], 1)] })),
    ).toBe("multiple_choice");
    expect(await kind(homework({ questions: [speaking()] }))).toBe("speaking");
    expect(await kind(mixed())).toBe("essay");
  });
});

describe("list and read", () => {
  it("lists the newest first with counts, and only for the teacher's own course", async () => {
    const { t, course, kids } = await setup();
    const first = await made(t, course.id, homework({ title: "First" }));
    await made(t, course.id, homework({ title: "Second" }));
    await hand(t.tenantId, first.id, kids[0]!.id, "submitted");
    await hand(t.tenantId, first.id, kids[1]!.id, "graded");
    await hand(t.tenantId, first.id, kids[2]!.id, "drafted");
    const list = (await call(`/api/courses/${course.id}/assignments`, { cookie: t.cookie })).json
      .assignments as A[];
    expect(list.map((a) => a.title)).toEqual(["Second", "First"]);
    expect(list[1]!.counts).toEqual({ targeted: 3, handedIn: 2, toGrade: 1 }); // a draft is not handed in
    const other = await createTeacher();
    expect((await call(`/api/courses/${course.id}/assignments`, { cookie: other.cookie })).status).toBe(404);
  });

  it("answers 'not found' for another teacher's work, the same as for a missing one", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    const other = await createTeacher();
    const theirs = await call(`/api/assignments/${a.id}`, { cookie: other.cookie });
    const missing = await call("/api/assignments/made-up-id", { cookie: other.cookie });
    expect(theirs.status).toBe(404);
    expect(theirs.json.error.code).toBe(missing.json.error.code);
    expect(await findAssignment(env.DB, other.tenantId, a.id)).toBeNull();
    expect(await findAssignment(env.DB, t.tenantId, a.id)).not.toBeNull();
  });
});

describe("change a homework", () => {
  it("saves changes and raises the version, keeping the ids of the questions", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id, mixed());
    const res = await update(t, a, { title: "Renamed", allowLate: true, dueDate: null, dueTime: null });
    expect(res.status).toBe(200);
    expect(res.json.assignment).toMatchObject({ title: "Renamed", allowLate: true, dueAt: null, version: 2 });
    expect(res.json.assignment.questions.map((q: { id: string }) => q.id)).toEqual(
      a.questions.map((q) => q.id),
    );
  });

  it("changes the questions, and the total follows", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id, homework({ questions: [written("W", 10)] }));
    const res = await update(t, a, { questions: [...a.questions, choice("New?", ["a", "b"], 0, 4)] });
    expect(res.json.assignment.maxScore).toBe(14);
    expect(res.json.assignment.questions).toHaveLength(2);
    expect(res.json.assignment.questions[0].id).toBe(a.questions[0]!.id);
    expect(res.json.assignment.questions[1].id).toMatch(/^q_/);
  });

  it("refuses a save made from an old version, and changes nothing (not even the chosen students)", async () => {
    const { t, course, kids } = await setup();
    const a = await made(t, course.id, homework({ targetMode: "selected", studentIds: [kids[0]!.id] }));
    expect(
      (await update(t, a, { title: "One", targetMode: "selected", studentIds: [kids[0]!.id] })).status,
    ).toBe(200);
    const stale = await update(t, a, {
      title: "Two",
      targetMode: "selected",
      studentIds: [kids[1]!.id, kids[2]!.id],
    });
    expect(stale.status).toBe(409);
    const now = await get(t, a.id);
    expect(now.title).toBe("One");
    expect(now.studentIds).toEqual([kids[0]!.id]);
  });

  it("two saves at the same moment: one wins, one is refused", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    const results = await Promise.all([update(t, a, { title: "One" }), update(t, a, { title: "Two" })]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it("replaces the chosen students, and clears them when the work is for everyone", async () => {
    const { t, course, kids } = await setup();
    const a = await made(t, course.id, homework({ targetMode: "selected", studentIds: [kids[0]!.id] }));
    const b = (await update(t, a, { targetMode: "selected", studentIds: [kids[1]!.id, kids[2]!.id] })).json
      .assignment as A;
    expect([...b.studentIds].sort()).toEqual([kids[1]!.id, kids[2]!.id].sort());
    const c = (await update(t, b, { targetMode: "all", studentIds: [] })).json.assignment as A;
    expect(c.studentIds).toEqual([]);
    expect(await count("SELECT COUNT(*) AS n FROM assignment_targets WHERE assignment_id = ?", a.id)).toBe(0);
  });

  it("refuses chosen students who are not in the course, and changes nothing", async () => {
    const { t, course, kids } = await setup();
    const outside = await addStudent(t);
    const a = await made(t, course.id, homework({ targetMode: "selected", studentIds: [kids[0]!.id] }));
    const res = await update(t, a, { targetMode: "selected", studentIds: [outside.id] });
    expect(res.status).toBe(400);
    expect((await get(t, a.id)).studentIds).toEqual([kids[0]!.id]);
  });

  it("can change everything in the questions while nobody has started, even after opening", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id, quiz());
    await act(t, a.id, "publish");
    const live = await get(t, a.id);
    const res = await update(t, live, { questions: [written("Now a written one", 6)] });
    expect(res.status).toBe(200);
    expect((await get(t, a.id)).questions.map((q) => q.kind)).toEqual(["written"]);
  });

  it("after students started, only the wording of a question can change", async () => {
    const { t, course, kids } = await setup();
    const a = await made(t, course.id, quiz());
    await hand(t.tenantId, a.id, kids[0]!.id, "drafted");
    const same = a.questions.map((q) => ({ ...q, text: `${q.text} (fixed typo)` }));
    expect((await update(t, a, { questions: same })).status).toBe(200);
    const b = await get(t, a.id);
    const refused: [string, unknown[]][] = [
      ["another correct answer", b.questions.map((q, i) => (i === 0 ? { ...q, correct: 0 } : q))],
      ["other points", b.questions.map((q, i) => (i === 0 ? { ...q, points: 9 } : q))],
      ["another answer text", b.questions.map((q, i) => (i === 0 ? { ...q, options: ["x", "y", "z"] } : q))],
      ["another accepted answer", b.questions.map((q, i) => (i === 2 ? { ...q, accepted: ["gone"] } : q))],
      ["a new question", [...b.questions, written("Extra", 1)]],
      ["a removed question", b.questions.slice(1)],
      ["another order", [b.questions[1], b.questions[0], b.questions[2]]],
    ];
    for (const [label, questions] of refused) {
      expect((await update(t, b, { questions })).status, label).toBe(409);
    }
    expect((await get(t, a.id)).questions[0]!.correct).toBe(1);
  });

  it("validates like creating does", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    for (const over of [
      { title: "" },
      { dueTime: null },
      { questions: [] },
      { links: [{ title: "x", url: "http://x.example" }] },
    ]) {
      expect((await update(t, a, over)).status).toBe(400);
    }
    expect(
      (await call(`/api/assignments/${a.id}`, { method: "PUT", cookie: t.cookie, body: homework() })).status,
    ).toBe(400); // no version
  });

  it("does not let another teacher change, publish, close or delete it", async () => {
    const { t, course, kids } = await setup();
    const a = await made(t, course.id, homework({ targetMode: "selected", studentIds: [kids[0]!.id] }));
    const other = await createTeacher();
    expect((await update(other, a, { title: "Hacked", targetMode: "all", studentIds: [] })).status).toBe(404);
    expect((await act(other, a.id, "publish")).status).toBe(404);
    expect((await act(other, a.id, "close")).status).toBe(404);
    expect((await call(`/api/assignments/${a.id}`, { method: "DELETE", cookie: other.cookie })).status).toBe(
      404,
    );
    expect(await get(t, a.id)).toMatchObject({
      title: "My weekend",
      status: "draft",
      studentIds: [kids[0]!.id],
    });
  });
});

describe("publish, close and delete", () => {
  it("publishes, closes and brings work back", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    expect((await act(t, a.id, "close")).status).toBe(409);
    expect((await act(t, a.id, "publish")).json.assignment.status).toBe("published");
    expect((await act(t, a.id, "publish")).status).toBe(409);
    expect((await act(t, a.id, "close")).json.assignment.status).toBe("closed");
    expect((await act(t, a.id, "close")).status).toBe(409);
    expect((await act(t, a.id, "publish")).json.assignment.status).toBe("published");
  });

  it("does not publish work of an archived course", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    await call(`/api/courses/${course.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    expect((await act(t, a.id, "publish")).status).toBe(409);
  });

  it("deletes a draft that nobody answered, and its chosen students with it", async () => {
    const { t, course, kids } = await setup();
    const a = await made(t, course.id, homework({ targetMode: "selected", studentIds: [kids[0]!.id] }));
    expect((await call(`/api/assignments/${a.id}`, { method: "DELETE", cookie: t.cookie })).status).toBe(200);
    expect((await call(`/api/assignments/${a.id}`, { cookie: t.cookie })).status).toBe(404);
    expect(await count("SELECT COUNT(*) AS n FROM assignment_targets WHERE assignment_id = ?", a.id)).toBe(0);
  });

  it("does not delete published work, or a draft that has an answer, and keeps its chosen students", async () => {
    const { t, course, kids } = await setup();
    const live = await made(t, course.id);
    await act(t, live.id, "publish");
    expect((await call(`/api/assignments/${live.id}`, { method: "DELETE", cookie: t.cookie })).status).toBe(
      409,
    );
    const draft = await made(t, course.id, homework({ targetMode: "selected", studentIds: [kids[0]!.id] }));
    await hand(t.tenantId, draft.id, kids[0]!.id, "drafted");
    expect((await call(`/api/assignments/${draft.id}`, { method: "DELETE", cookie: t.cookie })).status).toBe(
      409,
    );
    expect((await get(t, draft.id)).studentIds).toEqual([kids[0]!.id]);
  });

  it("writes every step to the audit log", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    await update(t, a, { title: "x" });
    await act(t, a.id, "publish");
    await act(t, a.id, "close");
    const rows = await env.DB.prepare(
      "SELECT action FROM audit_log WHERE tenant_id = ? AND action LIKE 'assignment.%' ORDER BY at, id",
    )
      .bind(t.tenantId)
      .all<{ action: string }>();
    expect(rows.results.map((r) => r.action)).toEqual([
      "assignment.created",
      "assignment.updated",
      "assignment.published",
      "assignment.closed",
    ]);
  });
});

describe("course links", () => {
  const add = (t: Person, courseId: string, over: Record<string, unknown> = {}) =>
    call(`/api/courses/${courseId}/materials`, {
      method: "POST",
      cookie: t.cookie,
      body: { title: "Unit 1 slides", url: "https://docs.example.com/slides", published: true, ...over },
    });
  const list = async (t: Person, courseId: string) =>
    (await call(`/api/courses/${courseId}/materials`, { cookie: t.cookie })).json.materials as {
      id: string;
      title: string;
      url: string;
      published: boolean;
    }[];

  it("adds, changes and removes a link", async () => {
    const { t, course } = await setup();
    const res = await add(t, course.id);
    expect(res.status).toBe(201);
    const id = res.json.materials[0].id;
    expect(res.json.materials[0]).toMatchObject({ title: "Unit 1 slides", published: true });
    const edited = await call(`/api/courses/${course.id}/materials/${id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { title: "Slides", url: "https://docs.example.com/v2", published: false },
    });
    expect(edited.json.materials[0]).toMatchObject({
      title: "Slides",
      url: "https://docs.example.com/v2",
      published: false,
    });
    expect(
      (await call(`/api/courses/${course.id}/materials/${id}`, { method: "DELETE", cookie: t.cookie })).json
        .materials,
    ).toEqual([]);
  });

  it("only accepts https links, and a title", async () => {
    const { t, course } = await setup();
    for (const over of [
      { url: "http://docs.example.com" },
      { url: "javascript:alert(1)" },
      { url: "data:text/html,hi" },
      { url: "ftp://x.example/a" },
      { url: "https://user:pw@x.example/" },
      { url: "docs.example.com" },
      { url: `https://x.example/${"a".repeat(2100)}` },
      { title: "" },
      { title: "x".repeat(101) },
    ]) {
      expect((await add(t, course.id, over)).status, JSON.stringify(over).slice(0, 50)).toBe(400);
    }
    expect(await list(t, course.id)).toEqual([]);
  });

  it("does not touch another teacher's course or links", async () => {
    const { t, course } = await setup();
    const id = (await add(t, course.id)).json.materials[0].id;
    const other = await createTeacher();
    expect((await add(other, course.id)).status).toBe(404);
    expect((await call(`/api/courses/${course.id}/materials`, { cookie: other.cookie })).status).toBe(404);
    const body = { title: "x", url: "https://x.example", published: true };
    expect(
      (await call(`/api/courses/${course.id}/materials/${id}`, { method: "PUT", cookie: other.cookie, body }))
        .status,
    ).toBe(404);
    expect(
      (await call(`/api/courses/${course.id}/materials/${id}`, { method: "DELETE", cookie: other.cookie }))
        .status,
    ).toBe(404);
    expect((await list(t, course.id)).map((m) => m.title)).toEqual(["Unit 1 slides"]);
  });

  it("does not add links to an archived course", async () => {
    const { t, course } = await setup();
    await call(`/api/courses/${course.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    expect((await add(t, course.id)).status).toBe(409);
  });
});

describe("the database refuses rows that mix tenants", () => {
  const t0 = "2030-01-01T00:00:00.000Z";

  it("for assignments, chosen students, submissions, extensions and links", async () => {
    const { t, course, kids } = await setup();
    const other = await createTeacher();
    const a = await made(t, course.id);
    const foreignKid = await addStudent(other);
    const inserts: [string, unknown[]][] = [
      [
        `INSERT INTO assignments (id, tenant_id, course_id, type, title, created_at, updated_at) VALUES ('x1', ?, ?, 'essay', 't', ?, ?)`,
        [other.tenantId, course.id, t0, t0],
      ],
      [
        `INSERT INTO assignment_targets (assignment_id, student_id, tenant_id) VALUES (?, ?, ?)`,
        [a.id, foreignKid.id, t.tenantId],
      ],
      [
        `INSERT INTO assignment_targets (assignment_id, student_id, tenant_id) VALUES (?, ?, ?)`,
        [a.id, kids[0]!.id, other.tenantId],
      ],
      [
        `INSERT INTO submissions (id, tenant_id, assignment_id, student_id, created_at, updated_at) VALUES ('x2', ?, ?, ?, ?, ?)`,
        [t.tenantId, a.id, foreignKid.id, t0, t0],
      ],
      [
        `INSERT INTO submission_extensions (assignment_id, student_id, tenant_id, until_at) VALUES (?, ?, ?, ?)`,
        [a.id, foreignKid.id, t.tenantId, t0],
      ],
      [
        `INSERT INTO course_materials (id, tenant_id, course_id, title, url, created_at, updated_at) VALUES ('x3', ?, ?, 't', 'https://x.example', ?, ?)`,
        [other.tenantId, course.id, t0, t0],
      ],
    ];
    for (const [sql, args] of inserts)
      await expect(
        env.DB.prepare(sql)
          .bind(...args)
          .run(),
      ).rejects.toThrow(/one tenant/);
  });

  it("keeps the history of scores: no edit and no delete", async () => {
    const { t, course, kids } = await setup();
    const a = await made(t, course.id);
    const subId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO submissions (id, tenant_id, assignment_id, student_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'x', 'x')`,
    )
      .bind(subId, t.tenantId, a.id, kids[0]!.id)
      .run();
    await env.DB.prepare(
      `INSERT INTO grade_revisions (id, tenant_id, submission_id, at, actor_user_id, new_score) VALUES ('r1', ?, ?, 'x', ?, 7)`,
    )
      .bind(t.tenantId, subId, t.userId)
      .run();
    await expect(
      env.DB.prepare("UPDATE grade_revisions SET new_score = 10 WHERE id = 'r1'").run(),
    ).rejects.toThrow(/append only/);
    await expect(env.DB.prepare("DELETE FROM grade_revisions WHERE id = 'r1'").run()).rejects.toThrow(
      /append only/,
    );
  });

  it("one hand-in per student and assignment, and only known statuses", async () => {
    const { t, course, kids } = await setup();
    const a = await made(t, course.id);
    await hand(t.tenantId, a.id, kids[0]!.id);
    await expect(hand(t.tenantId, a.id, kids[0]!.id)).rejects.toThrow();
    await expect(hand(t.tenantId, a.id, kids[1]!.id, "excellent")).rejects.toThrow();
  });
});

describe("who may use homework", () => {
  it("a student gets 403 on every teacher route, and a signed out person 401", async () => {
    const { t, course } = await setup();
    const a = await made(t, course.id);
    const kid = await createStudent(t);
    const calls: [string, string, unknown?][] = [
      ["GET", `/api/courses/${course.id}/assignments`],
      ["POST", `/api/courses/${course.id}/assignments`, homework()],
      ["GET", `/api/assignments/${a.id}`],
      ["PUT", `/api/assignments/${a.id}`, { ...homework(), version: 1 }],
      ["POST", `/api/assignments/${a.id}/publish`, {}],
      ["POST", `/api/assignments/${a.id}/close`, {}],
      ["DELETE", `/api/assignments/${a.id}`],
      ["GET", `/api/courses/${course.id}/materials`],
      [
        "POST",
        `/api/courses/${course.id}/materials`,
        { title: "x", url: "https://x.example", published: true },
      ],
      [
        "PUT",
        `/api/courses/${course.id}/materials/x`,
        { title: "x", url: "https://x.example", published: true },
      ],
      ["DELETE", `/api/courses/${course.id}/materials/x`],
    ];
    for (const [method, path, payload] of calls) {
      expect(
        (await call(path, { method, cookie: kid.cookie, body: payload })).status,
        `${method} ${path}`,
      ).toBe(403);
      expect((await call(path, { method, body: payload })).status, `${method} ${path}`).toBe(401);
    }
  });
});
