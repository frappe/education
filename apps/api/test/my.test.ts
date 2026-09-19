import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { saveAnswerStatement } from "../src/repos/mywork";
import { call, createCourse, createStudent, createTeacher, latestToken, type Person } from "./helpers";

const essayBody = (over: Record<string, unknown> = {}) => ({
  type: "essay",
  title: "My weekend",
  instructions: "Write 100 words.",
  questions: [],
  links: [{ title: "Word list", url: "https://example.com/words" }],
  dueDate: "2099-01-10",
  dueTime: "18:00",
  allowLate: false,
  maxScore: 10,
  targetMode: "all",
  studentIds: [],
  ...over,
});
const mcqBody = (over: Record<string, unknown> = {}) =>
  essayBody({
    type: "multiple_choice",
    title: "Quiz",
    questions: [
      { text: "She ___ to school.", options: ["go", "goes", "going"] },
      { text: "They ___ happy.", options: ["is", "are"] },
    ],
    links: [],
    ...over,
  });
const speakingBody = (over: Record<string, unknown> = {}) =>
  essayBody({ type: "speaking", title: "Introduce yourself", ...over });

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

async function publish(t: Person, courseId: string, body: Record<string, unknown>) {
  const made = await call(`/api/courses/${courseId}/assignments`, { method: "POST", cookie: t.cookie, body });
  expect(made.status, JSON.stringify(made.json)).toBe(201);
  const id = made.json.assignment.id as string;
  expect(
    (await call(`/api/assignments/${id}/publish`, { method: "POST", cookie: t.cookie, body: {} })).status,
  ).toBe(200);
  return id;
}

/** A teacher, a course, one student who joined it, and work of each kind. */
async function setup() {
  const t = await createTeacher("Lan Tran");
  const course = await createCourse(t, { maxStudents: null, name: "English A1" });
  const kid = await joinedKid(t, course.id, "Hoa");
  return { t, course, kid };
}

const work = async (kid: Person) =>
  (await call("/api/my/work", { cookie: kid.cookie })).json.work as {
    id: string;
    title: string;
    status: string;
    score: number | null;
    dueDate: string | null;
    dueTime: string | null;
    dueAt: string | null;
    isLate: boolean;
  }[];
const detail = (kid: Person, id: string) => call(`/api/my/work/${id}`, { cookie: kid.cookie });
const draft = (kid: Person, id: string, body: Record<string, unknown>) =>
  call(`/api/my/work/${id}/draft`, { method: "PUT", cookie: kid.cookie, body });
const hand = (kid: Person, id: string, body: Record<string, unknown>) =>
  call(`/api/my/work/${id}/submit`, { method: "POST", cookie: kid.cookie, body });
const answer = (over: Record<string, unknown> = {}) => ({
  textAnswer: "I played football.",
  linkUrl: null,
  answers: [],
  ...over,
});
const subRow = (assignmentId: string, studentId: string) =>
  env.DB.prepare("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?")
    .bind(assignmentId, studentId)
    .first<Record<string, unknown>>();

describe("the student's courses", () => {
  it("shows the courses the student is in, with the teacher and the next lesson", async () => {
    const { t, course, kid } = await setup();
    await call(`/api/courses/${course.id}/lessons`, {
      method: "POST",
      cookie: t.cookie,
      body: {
        title: "Unit 1",
        date: "2099-01-05",
        startTime: "18:30",
        durationMinutes: 90,
        place: "",
        onlineUrl: null,
        repeatWeeks: 1,
      },
    });
    await publish(t, course.id, essayBody());
    const res = await call("/api/my/courses", { cookie: kid.cookie });
    expect(res.status).toBe(200);
    expect(res.json.courses).toEqual([
      expect.objectContaining({
        id: course.id,
        name: "English A1",
        teacherName: "Lan Tran",
        openWork: 1,
        nextLesson: { date: "2099-01-05", startTime: "18:30", endTime: "20:00", title: "Unit 1" },
      }),
    ]);
  });

  it("does not show a course after the student left it, was archived, or the course was archived", async () => {
    const { t, course, kid } = await setup();
    const other = await createCourse(t, { maxStudents: null, name: "Other" });
    await call(`/api/courses/${other.id}/students`, {
      method: "POST",
      cookie: t.cookie,
      body: { studentIds: [kid.studentId], customPrice: null },
    });
    expect((await call("/api/my/courses", { cookie: kid.cookie })).json.courses).toHaveLength(2);
    await call(`/api/courses/${other.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    expect(
      (await call("/api/my/courses", { cookie: kid.cookie })).json.courses.map((c: { id: string }) => c.id),
    ).toEqual([course.id]);
    await call(`/api/courses/${course.id}/students/${kid.studentId}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { status: "dropped", customPrice: null },
    });
    expect((await call("/api/my/courses", { cookie: kid.cookie })).json.courses).toEqual([]);
    expect((await call(`/api/my/courses/${course.id}`, { cookie: kid.cookie })).status).toBe(404);
  });

  it("shows the course page: only shared links, coming lessons, and the work", async () => {
    const { t, course, kid } = await setup();
    for (const [title, published] of [
      ["Slides", true],
      ["Teacher only", false],
    ] as const) {
      await call(`/api/courses/${course.id}/materials`, {
        method: "POST",
        cookie: t.cookie,
        body: { title, url: "https://docs.example.com/x", published },
      });
    }
    await publish(t, course.id, essayBody());
    await call(`/api/courses/${course.id}/assignments`, {
      method: "POST",
      cookie: t.cookie,
      body: essayBody({ title: "A draft" }),
    }); // not published
    const res = await call(`/api/my/courses/${course.id}`, { cookie: kid.cookie });
    expect(res.status).toBe(200);
    expect(res.json.materials.map((m: { title: string }) => m.title)).toEqual(["Slides"]);
    expect(res.json.work.map((w: { title: string }) => w.title)).toEqual(["My weekend"]);
  });

  it("answers 'not found' for a course of someone else, the same as a missing one", async () => {
    const { kid } = await setup();
    const other = await createTeacher();
    const foreign = await createCourse(other);
    const a = await call(`/api/my/courses/${foreign.id}`, { cookie: kid.cookie });
    const b = await call("/api/my/courses/made-up", { cookie: kid.cookie });
    expect(a.status).toBe(404);
    expect(a.json.error.code).toBe(b.json.error.code);
  });
});

describe("what work a student sees", () => {
  it("shows published and closed work, not drafts, and shows the due time in the teacher's time zone", async () => {
    const { t, course, kid } = await setup();
    const live = await publish(t, course.id, essayBody({ title: "Live" }));
    const closed = await publish(t, course.id, essayBody({ title: "Closed" }));
    await call(`/api/assignments/${closed}/close`, { method: "POST", cookie: t.cookie, body: {} });
    await call(`/api/courses/${course.id}/assignments`, {
      method: "POST",
      cookie: t.cookie,
      body: essayBody({ title: "Draft" }),
    });
    const list = await work(kid);
    expect(list.map((w) => w.title).sort()).toEqual(["Closed", "Live"]);
    expect(list.find((w) => w.title === "Live")).toMatchObject({
      status: "not_started",
      dueDate: "2099-01-10",
      dueTime: "18:00",
      score: null,
    });
    void live;
  });

  it("shows work for everyone, and work chosen for this student only", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    await publish(t, course.id, essayBody({ title: "For all" }));
    await publish(
      t,
      course.id,
      essayBody({ title: "For Nam", targetMode: "selected", studentIds: [other.studentId] }),
    );
    await publish(
      t,
      course.id,
      essayBody({ title: "For Hoa", targetMode: "selected", studentIds: [kid.studentId] }),
    );
    expect((await work(kid)).map((w) => w.title).sort()).toEqual(["For Hoa", "For all"]);
    expect((await work(other)).map((w) => w.title).sort()).toEqual(["For Nam", "For all"]);
  });

  it("does not show work of another course, another teacher, or after the student left", async () => {
    const { t, course, kid } = await setup();
    const otherCourse = await createCourse(t, { maxStudents: null });
    await publish(t, otherCourse.id, essayBody({ title: "Other course" }));
    const teacher2 = await createTeacher();
    const foreignCourse = await createCourse(teacher2, { maxStudents: null });
    await publish(teacher2, foreignCourse.id, essayBody({ title: "Foreign" }));
    const mine = await publish(t, course.id, essayBody({ title: "Mine" }));
    expect((await work(kid)).map((w) => w.title)).toEqual(["Mine"]);
    expect((await detail(kid, "made-up")).status).toBe(404);
    await call(`/api/courses/${course.id}/students/${kid.studentId}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { status: "dropped", customPrice: null },
    });
    expect(await work(kid)).toEqual([]);
    expect((await detail(kid, mine)).status).toBe(404);
  });

  it("does not show work of a student who was archived, or of a paused teacher", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await setSql("UPDATE tenants SET status = 'suspended' WHERE id = ?", t.tenantId);
    // A paused teacher takes away every student's access at once (they have no active class left).
    expect((await detail(kid, id)).status).toBe(403);
    await setSql("UPDATE tenants SET status = 'active' WHERE id = ?", t.tenantId);
    await call(`/api/students/${kid.studentId}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    expect((await detail(kid, id)).status).toBe(404);
  });

  it("a student of two teachers sees the work of the active one only, when the other is paused", async () => {
    const { t, course, kid } = await setup();
    const teacher2 = await createTeacher();
    const course2 = await createCourse(teacher2, { maxStudents: null });
    await call("/api/invites", {
      method: "POST",
      cookie: teacher2.cookie,
      body: { name: "Hoa", email: kid.email },
    });
    await call("/api/invites/accept", {
      method: "POST",
      body: { token: await latestToken(kid.email, "invite") },
    });
    const profile = (await call("/api/students?page=1", { cookie: teacher2.cookie })).json.students.find(
      (s: { email: string }) => s.email === kid.email,
    );
    await call(`/api/courses/${course2.id}/students`, {
      method: "POST",
      cookie: teacher2.cookie,
      body: { studentIds: [profile.id], customPrice: null },
    });
    await publish(t, course.id, essayBody({ title: "From teacher 1" }));
    await publish(teacher2, course2.id, essayBody({ title: "From teacher 2" }));
    expect((await work(kid)).map((w) => w.title).sort()).toEqual(["From teacher 1", "From teacher 2"]);
    expect((await call("/api/my/courses", { cookie: kid.cookie })).json.courses).toHaveLength(2);
    await setSql("UPDATE tenants SET status = 'suspended' WHERE id = ?", t.tenantId);
    expect((await work(kid)).map((w) => w.title)).toEqual(["From teacher 2"]);
    expect(
      (await call("/api/my/courses", { cookie: kid.cookie })).json.courses.map((c: { id: string }) => c.id),
    ).toEqual([course2.id]);
  });

  it("the write itself is tied to the student's own account, even when called directly", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const id = await publish(t, course.id, essayBody());
    const write = (userId: string) =>
      saveAnswerStatement(env.DB, {
        id: crypto.randomUUID(),
        userId,
        tenantId: t.tenantId,
        studentId: kid.studentId,
        assignmentId: id,
        handIn: false,
        text: "x",
        link: null,
        answers: [],
      }).run();
    expect((await write(other.userId)).meta.changes).toBe(0); // Nam's account cannot write Hoa's answer
    expect((await write(kid.userId)).meta.changes).toBe(1);
  });

  it("gives the whole work: instructions, questions, links, and what may be done", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(
      t,
      course.id,
      mcqBody({ links: [{ title: "Guide", url: "https://example.com/g" }] }),
    );
    const res = await detail(kid, id);
    expect(res.json.work).toMatchObject({
      title: "Quiz",
      type: "multiple_choice",
      instructions: "Write 100 words.",
      links: [{ title: "Guide", url: "https://example.com/g" }],
      canEdit: true,
      blocked: null,
      feedback: "",
      answer: { textAnswer: "", linkUrl: null, answers: [] },
    });
    expect(res.json.work.questions).toHaveLength(2);
  });
});

describe("saving a draft", () => {
  it("saves and saves again, keeping one row and the status 'drafted'", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    const first = await draft(kid, id, answer({ textAnswer: "First try" }));
    expect(first.status).toBe(200);
    expect(first.json.work).toMatchObject({ status: "drafted", answer: { textAnswer: "First try" } });
    const second = await draft(
      kid,
      id,
      answer({ textAnswer: "Second try", linkUrl: "https://docs.example.com/mine" }),
    );
    expect(second.json.work.answer).toMatchObject({
      textAnswer: "Second try",
      linkUrl: "https://docs.example.com/mine",
    });
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", id)).toBe(1);
    expect((await work(kid))[0]!.status).toBe("drafted");
  });

  it("an empty draft is fine, a handed-in answer is not", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    expect((await draft(kid, id, answer({ textAnswer: "" }))).status).toBe(200);
  });

  it("keeps multiple choice answers, and checks them", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, mcqBody());
    expect(
      (await draft(kid, id, answer({ textAnswer: "", answers: [1, -1] }))).json.work.answer.answers,
    ).toEqual([1, -1]);
    for (const answers of [[], [1], [1, 1, 1], [3, 0], [0, 2], [-2, 0]]) {
      expect(
        (await draft(kid, id, answer({ textAnswer: "", answers }))).status,
        JSON.stringify(answers),
      ).toBe(400);
    }
    expect((await work(kid))[0]!.status).toBe("drafted");
  });

  it("only takes https links, and short notes for speaking", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, speakingBody());
    for (const linkUrl of [
      "http://x.example/v",
      "javascript:alert(1)",
      "https://u:p@x.example",
      "video.example.com",
    ]) {
      expect((await draft(kid, id, answer({ linkUrl }))).status, linkUrl).toBe(400);
    }
    expect(
      (await draft(kid, id, answer({ textAnswer: "x".repeat(2001), linkUrl: "https://youtu.be/abc" })))
        .status,
    ).toBe(400);
    expect(
      (await draft(kid, id, answer({ textAnswer: "My note", linkUrl: "https://youtu.be/abc" }))).status,
    ).toBe(200);
  });

  it("keeps only the parts that belong to the kind of work", async () => {
    const { t, course, kid } = await setup();
    const quiz = await publish(t, course.id, mcqBody());
    const res = await draft(kid, quiz, {
      textAnswer: "sneaky text",
      linkUrl: "https://x.example",
      answers: [0, 1],
    });
    expect(res.json.work.answer).toEqual({ textAnswer: "", linkUrl: null, answers: [0, 1] });
    const talk = await publish(t, course.id, speakingBody());
    expect(
      (await draft(kid, talk, { textAnswer: "", linkUrl: "https://x.example/v", answers: [1, 2] })).json.work
        .answer.answers,
    ).toEqual([]);
  });

  it("refuses too long text", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    expect((await draft(kid, id, answer({ textAnswer: "x".repeat(10001) }))).status).toBe(400);
    expect((await draft(kid, id, answer({ textAnswer: "x".repeat(10000) }))).status).toBe(200);
  });
});

describe("handing in", () => {
  it("hands in an essay: status, time, and not late", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await draft(kid, id, answer());
    const res = await hand(kid, id, answer());
    expect(res.status).toBe(200);
    expect(res.json.work).toMatchObject({
      status: "submitted",
      isLate: false,
      canEdit: false,
      blocked: "handed_in",
    });
    expect(res.json.work.submittedAt).toMatch(/^\d{4}-/);
  });

  it("can hand in without saving a draft first", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    expect((await hand(kid, id, answer())).json.work.status).toBe("submitted");
  });

  it("asks for a real answer: text or link for an essay, a link for speaking, every question for a quiz", async () => {
    const { t, course, kid } = await setup();
    const e = await publish(t, course.id, essayBody());
    expect((await hand(kid, e, answer({ textAnswer: "   " }))).status).toBe(400);
    expect(
      (await hand(kid, e, answer({ textAnswer: "", linkUrl: "https://docs.example.com/essay" }))).status,
    ).toBe(200);
    const s = await publish(t, course.id, speakingBody());
    expect((await hand(kid, s, answer({ textAnswer: "only a note" }))).status).toBe(400);
    expect((await hand(kid, s, answer({ textAnswer: "", linkUrl: "https://youtu.be/abc" }))).status).toBe(
      200,
    );
    const q = await publish(t, course.id, mcqBody());
    expect((await hand(kid, q, answer({ textAnswer: "", answers: [0, -1] }))).status).toBe(400);
    expect((await hand(kid, q, answer({ textAnswer: "", answers: [0, 1] }))).status).toBe(200);
  });

  it("cannot be handed in twice or changed afterwards, and the first answer stays", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await hand(kid, id, answer({ textAnswer: "Original" }));
    expect((await hand(kid, id, answer({ textAnswer: "Changed" }))).status).toBe(409);
    expect((await draft(kid, id, answer({ textAnswer: "Changed" }))).status).toBe(409);
    expect((await detail(kid, id)).json.work.answer.textAnswer).toBe("Original");
  });

  it("two hand-ins at the same moment: one wins", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    const results = await Promise.all([
      hand(kid, id, answer({ textAnswer: "A" })),
      hand(kid, id, answer({ textAnswer: "B" })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", id)).toBe(1);
  });

  it("writes to the audit log", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await draft(kid, id, answer());
    await hand(kid, id, answer());
    expect(
      await count(
        "SELECT COUNT(*) AS n FROM audit_log WHERE tenant_id = ? AND action = 'submission.handed_in' AND target_id = ?",
        t.tenantId,
        id,
      ),
    ).toBe(1);
  });
});

describe("the deadline is kept by the server", () => {
  const pastDue = (id: string) =>
    setSql(
      "UPDATE assignments SET due_at = ? WHERE id = ?",
      new Date(Date.now() - 3600_000).toISOString(),
      id,
    );

  it("refuses a draft and a hand-in after the time is up", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await draft(kid, id, answer({ textAnswer: "Saved before" }));
    await pastDue(id);
    const late = await hand(kid, id, answer());
    expect(late.status).toBe(409);
    expect(late.json.error.code).toBe("DEADLINE_PASSED");
    expect((await draft(kid, id, answer({ textAnswer: "Too late" }))).json.error.code).toBe(
      "DEADLINE_PASSED",
    );
    expect((await detail(kid, id)).json.work).toMatchObject({
      canEdit: false,
      blocked: "deadline",
      answer: { textAnswer: "Saved before" },
    });
    expect((await subRow(id, kid.studentId))!.status).toBe("drafted");
  });

  it("takes late work when the teacher allows it, and marks it late", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody({ allowLate: true }));
    await pastDue(id);
    const res = await hand(kid, id, answer());
    expect(res.status).toBe(200);
    expect(res.json.work).toMatchObject({ status: "submitted", isLate: true });
  });

  it("takes work in time when there is no due date", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody({ dueDate: null, dueTime: null }));
    expect((await hand(kid, id, answer())).json.work.isLate).toBe(false);
  });

  it("gives one student more time, and shows that time to them", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const id = await publish(t, course.id, essayBody());
    await pastDue(id);
    const until = new Date(Date.now() + 86_400_000).toISOString();
    await setSql(
      "INSERT INTO submission_extensions (assignment_id, student_id, tenant_id, until_at) VALUES (?, ?, ?, ?)",
      id,
      kid.studentId,
      t.tenantId,
      until,
    );
    const res = await hand(kid, id, answer());
    expect(res.status).toBe(200);
    expect(res.json.work.isLate).toBe(false);
    expect(res.json.work.dueAt).toBe(until);
    expect((await hand(other, id, answer())).status).toBe(409); // the other student has no extra time
  });

  it("an extension that has run out does not help", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await pastDue(id);
    await setSql(
      "INSERT INTO submission_extensions (assignment_id, student_id, tenant_id, until_at) VALUES (?, ?, ?, ?)",
      id,
      kid.studentId,
      t.tenantId,
      new Date(Date.now() - 1000).toISOString(),
    );
    expect((await hand(kid, id, answer())).json.error.code).toBe("DEADLINE_PASSED");
  });

  it("refuses work the teacher closed, but shows it", async () => {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await call(`/api/assignments/${id}/close`, { method: "POST", cookie: t.cookie, body: {} });
    const res = await hand(kid, id, answer());
    expect(res.status).toBe(409);
    expect((await detail(kid, id)).json.work).toMatchObject({
      blocked: "closed",
      assignmentStatus: "closed",
    });
  });
});

describe("scores stay hidden until the teacher returns the work", () => {
  async function graded(status: string, feedback = "Well done", score = 8) {
    const { t, course, kid } = await setup();
    const id = await publish(t, course.id, essayBody());
    await hand(kid, id, answer());
    await setSql(
      "UPDATE submissions SET status = ?, score = ?, feedback = ? WHERE assignment_id = ?",
      status,
      score,
      feedback,
      id,
    );
    return { id, kid };
  }

  it("hides score and feedback while the work is only submitted or scored", async () => {
    for (const status of ["submitted", "graded"]) {
      const { id, kid } = await graded(status);
      expect((await detail(kid, id)).json.work).toMatchObject({ status, score: null, feedback: "" });
      expect((await work(kid))[0]!.score).toBeNull();
    }
  });

  it("shows score and feedback once returned", async () => {
    const { id, kid } = await graded("returned");
    expect((await detail(kid, id)).json.work).toMatchObject({
      status: "returned",
      score: 8,
      feedback: "Well done",
      canEdit: false,
    });
    expect((await work(kid))[0]!.score).toBe(8);
  });

  it("shows the reason (but no score) when asked to do it again, and lets the student try again", async () => {
    const { id, kid } = await graded("revision_requested", "Add more detail", 5);
    const res = await detail(kid, id);
    expect(res.json.work).toMatchObject({
      status: "revision_requested",
      score: null,
      feedback: "Add more detail",
      canEdit: true,
    });
    expect((await draft(kid, id, answer({ textAnswer: "Better" }))).json.work.status).toBe(
      "revision_requested",
    ); // a draft keeps the status
    const again = await hand(kid, id, answer({ textAnswer: "Much better" }));
    expect(again.status).toBe(200);
    expect(again.json.work.status).toBe("submitted");
    expect(await count("SELECT revision_count AS n FROM submissions WHERE assignment_id = ?", id)).toBe(1);
  });
});

describe("students cannot reach each other's work", () => {
  it("each student has their own answer for the same work", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const id = await publish(t, course.id, essayBody());
    await draft(kid, id, answer({ textAnswer: "Hoa's answer" }));
    await draft(other, id, answer({ textAnswer: "Nam's answer" }));
    expect((await detail(kid, id)).json.work.answer.textAnswer).toBe("Hoa's answer");
    expect((await detail(other, id)).json.work.answer.textAnswer).toBe("Nam's answer");
    await hand(other, id, answer({ textAnswer: "Nam's answer" }));
    expect((await detail(kid, id)).json.work).toMatchObject({ status: "drafted", canEdit: true }); // Nam handing in changes nothing for Hoa
  });

  it("a student of another teacher gets 'not found' for this work, and cannot write to it", async () => {
    const { t, course } = await setup();
    const id = await publish(t, course.id, essayBody());
    const teacher2 = await createTeacher();
    const course2 = await createCourse(teacher2, { maxStudents: null });
    const stranger = await joinedKid(teacher2, course2.id, "Stranger");
    expect((await detail(stranger, id)).status).toBe(404);
    expect((await draft(stranger, id, answer())).status).toBe(404);
    expect((await hand(stranger, id, answer())).status).toBe(404);
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", id)).toBe(0);
  });

  it("a student of the same teacher who is not in the course cannot see or write to the work", async () => {
    const { t, course } = await setup();
    const id = await publish(t, course.id, essayBody());
    const otherCourse = await createCourse(t, { maxStudents: null });
    const outsider = await joinedKid(t, otherCourse.id, "Outsider");
    expect((await detail(outsider, id)).status).toBe(404);
    expect((await hand(outsider, id, answer())).status).toBe(404);
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", id)).toBe(0);
  });

  it("work chosen for another student cannot be seen or answered", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const id = await publish(
      t,
      course.id,
      essayBody({ targetMode: "selected", studentIds: [other.studentId] }),
    );
    expect((await detail(kid, id)).status).toBe(404);
    expect((await hand(kid, id, answer())).status).toBe(404);
  });

  it("ignores a student, tenant or status sent in the body", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const id = await publish(t, course.id, essayBody());
    const res = await draft(kid, id, {
      ...answer(),
      studentId: other.studentId,
      tenantId: "x",
      status: "returned",
      score: 10,
      feedback: "Great",
    });
    expect(res.status).toBe(200);
    expect(await subRow(id, other.studentId)).toBeNull();
    expect(await subRow(id, kid.studentId)).toMatchObject({ status: "drafted", score: null, feedback: "" });
  });

  it("a teacher who is not a student gets 403 on the student routes", async () => {
    const t = await createTeacher();
    for (const [method, path] of [
      ["GET", "/api/my/work"],
      ["GET", "/api/my/courses"],
      ["PUT", "/api/my/work/x/draft"],
      ["POST", "/api/my/work/x/submit"],
    ] as const) {
      expect(
        (await call(path, { method, cookie: t.cookie, body: method === "GET" ? undefined : answer() }))
          .status,
        path,
      ).toBe(403);
    }
  });
});
