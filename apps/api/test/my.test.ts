import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { saveAnswerStatement } from "../src/repos/mywork";
import { call, createCourse, createTeacher, latestToken, type Person } from "./helpers";
import {
  a,
  choice,
  draft,
  fullAnswers,
  homework,
  joinedKid,
  mixed,
  myWork,
  myWorkDetail,
  publish,
  quiz,
  short,
  speaking,
  submit,
  written,
  type Kid,
} from "./homework";

const setSql = (sql: string, ...args: unknown[]) =>
  env.DB.prepare(sql)
    .bind(...args)
    .run();
const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;
const subRow = (assignmentId: string, studentId: string) =>
  env.DB.prepare("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?")
    .bind(assignmentId, studentId)
    .first<Record<string, unknown>>();

async function setup() {
  const t = await createTeacher("Lan Tran");
  const course = await createCourse(t, { maxStudents: null, name: "English A1" });
  const kid = await joinedKid(t, course.id, "Hoa");
  return { t, course, kid };
}

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
    await publish(t, course.id);
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

  it("does not show a course after the student left it, or when the course was archived", async () => {
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

  it("shows the course page: only shared links, and the work", async () => {
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
    await publish(t, course.id);
    await call(`/api/courses/${course.id}/assignments`, {
      method: "POST",
      cookie: t.cookie,
      body: homework({ title: "A draft" }),
    });
    const res = await call(`/api/my/courses/${course.id}`, { cookie: kid.cookie });
    expect(res.json.materials.map((m: { title: string }) => m.title)).toEqual(["Slides"]);
    expect(res.json.work.map((w: { title: string }) => w.title)).toEqual(["My weekend"]);
  });

  it("answers 'not found' for a course of someone else, the same as a missing one", async () => {
    const { kid } = await setup();
    const other = await createTeacher();
    const foreign = await createCourse(other);
    const x = await call(`/api/my/courses/${foreign.id}`, { cookie: kid.cookie });
    const y = await call("/api/my/courses/made-up", { cookie: kid.cookie });
    expect(x.status).toBe(404);
    expect(x.json.error.code).toBe(y.json.error.code);
  });
});

describe("what work a student sees", () => {
  it("shows published and closed work, not drafts, with the number of questions and the points", async () => {
    const { t, course, kid } = await setup();
    await publish(t, course.id, homework({ title: "Live", questions: [written("W", 4), written("V", 6)] }));
    const closed = await publish(t, course.id, homework({ title: "Closed" }));
    await call(`/api/assignments/${closed.id}/close`, { method: "POST", cookie: t.cookie, body: {} });
    await call(`/api/courses/${course.id}/assignments`, {
      method: "POST",
      cookie: t.cookie,
      body: homework({ title: "Draft" }),
    });
    const list = await myWork(kid);
    expect(list.map((w) => w.title).sort()).toEqual(["Closed", "Live"]);
    expect(list.find((w) => w.title === "Live")).toMatchObject({
      status: "not_started",
      dueDate: "2099-01-10",
      dueTime: "18:00",
      score: null,
      questionCount: 2,
      maxScore: 10,
    });
  });

  it("shows work for everyone, and work chosen for this student only", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    await publish(t, course.id, homework({ title: "For all" }));
    await publish(
      t,
      course.id,
      homework({ title: "For Nam", targetMode: "selected", studentIds: [other.studentId] }),
    );
    await publish(
      t,
      course.id,
      homework({ title: "For Hoa", targetMode: "selected", studentIds: [kid.studentId] }),
    );
    expect((await myWork(kid)).map((w) => w.title).sort()).toEqual(["For Hoa", "For all"]);
    expect((await myWork(other)).map((w) => w.title).sort()).toEqual(["For Nam", "For all"]);
  });

  it("does not show work of another course, another teacher, or after the student left", async () => {
    const { t, course, kid } = await setup();
    const otherCourse = await createCourse(t, { maxStudents: null });
    await publish(t, otherCourse.id, homework({ title: "Other course" }));
    const teacher2 = await createTeacher();
    const foreignCourse = await createCourse(teacher2, { maxStudents: null });
    await publish(teacher2, foreignCourse.id, homework({ title: "Foreign" }));
    const mine = await publish(t, course.id, homework({ title: "Mine" }));
    expect((await myWork(kid)).map((w) => w.title)).toEqual(["Mine"]);
    expect((await myWorkDetail(kid, "made-up")).status).toBe(404);
    await call(`/api/courses/${course.id}/students/${kid.studentId}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { status: "dropped", customPrice: null },
    });
    expect(await myWork(kid)).toEqual([]);
    expect((await myWorkDetail(kid, mine.id)).status).toBe(404);
  });

  it("does not show work of an archived student, and a paused teacher takes every student's access away", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    await setSql("UPDATE tenants SET status = 'suspended' WHERE id = ?", t.tenantId);
    expect((await myWorkDetail(kid, w.id)).status).toBe(403);
    await setSql("UPDATE tenants SET status = 'active' WHERE id = ?", t.tenantId);
    await call(`/api/students/${kid.studentId}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    expect((await myWorkDetail(kid, w.id)).status).toBe(404);
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
    await publish(t, course.id, homework({ title: "From teacher 1" }));
    await publish(teacher2, course2.id, homework({ title: "From teacher 2" }));
    expect((await myWork(kid)).map((w) => w.title).sort()).toEqual(["From teacher 1", "From teacher 2"]);
    await setSql("UPDATE tenants SET status = 'suspended' WHERE id = ?", t.tenantId);
    expect((await myWork(kid)).map((w) => w.title)).toEqual(["From teacher 2"]);
    expect(
      (await call("/api/my/courses", { cookie: kid.cookie })).json.courses.map((c: { id: string }) => c.id),
    ).toEqual([course2.id]);
  });

  it("gives the whole work: instructions, links, and the questions", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(
      t,
      course.id,
      mixed({ links: [{ title: "Guide", url: "https://example.com/g" }] }),
    );
    const res = await myWorkDetail(kid, w.id);
    expect(res.json.work).toMatchObject({
      title: "Unit 1 test",
      instructions: "Do your best.",
      links: [{ title: "Guide", url: "https://example.com/g" }],
      canEdit: true,
      blocked: null,
      feedback: "",
      results: null,
      maxScore: 15,
    });
    expect(res.json.work.questions.map((q: { kind: string; points: number }) => [q.kind, q.points])).toEqual([
      ["choice", 2],
      ["short", 3],
      ["written", 5],
      ["speaking", 5],
    ]);
    expect(res.json.work.answers).toHaveLength(4); // an empty answer for each question
  });

  it("never sends the correct answers while the student can still change their work", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    const seen = async () => JSON.stringify((await myWorkDetail(kid, w.id)).json);
    for (const step of ["before starting", "with a draft"]) {
      const text = await seen();
      expect(text, step).not.toContain("gato");
      expect(text, step).not.toContain("accepted");
      expect(text, step).not.toContain("correct");
      await draft(kid, w.id, [a.choice(w.questions[0]!.id, 1)]);
    }
    const list = JSON.stringify((await call("/api/my/work", { cookie: kid.cookie })).json);
    expect(list).not.toContain("gato");
  });
});

describe("saving a draft", () => {
  it("saves and saves again, keeping one row and the status 'drafted'", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    const q = w.questions[0]!.id;
    const first = await draft(kid, w.id, [a.text(q, "First try")]);
    expect(first.status).toBe(200);
    expect(first.json.work).toMatchObject({
      status: "drafted",
      answers: [{ questionId: q, text: "First try" }],
    });
    const second = await draft(kid, w.id, [a.text(q, "Second try")]);
    expect(second.json.work.answers[0].text).toBe("Second try");
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", w.id)).toBe(1);
    expect((await myWork(kid))[0]!.status).toBe("drafted");
  });

  it("a draft never gets points or a score, whatever the answers are", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, quiz());
    await draft(kid, w.id, [
      a.choice(w.questions[0]!.id, 1),
      a.choice(w.questions[1]!.id, 1),
      a.text(w.questions[2]!.id, "went"),
    ]);
    const row = await subRow(w.id, kid.studentId);
    expect(row).toMatchObject({
      status: "drafted",
      score: null,
      question_points: "{}",
      submitted_at: null,
      returned_at: null,
    });
    expect((await myWorkDetail(kid, w.id)).json.work).toMatchObject({
      status: "drafted",
      score: null,
      results: null,
    });
  });

  it("an empty or partial draft is fine", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    expect((await draft(kid, w.id, [])).status).toBe(200);
    const partial = await draft(kid, w.id, [a.choice(w.questions[0]!.id, 1)]);
    expect(partial.json.work.answers.map((x: { choice: number | null }) => x.choice)).toEqual([
      1,
      null,
      null,
      null,
    ]);
  });

  it("keeps the answers of each kind of question", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    const [c, s, wr, sp] = w.questions.map((q) => q.id) as [string, string, string, string];
    const res = await draft(kid, w.id, [
      a.choice(c, 2),
      a.text(s, " Gato "),
      a.text(wr, "Long text"),
      a.video(sp, "https://youtu.be/abc", "note"),
    ]);
    expect(res.json.work.answers).toEqual([
      { questionId: c, choice: 2, text: "", link: null },
      { questionId: s, choice: null, text: "Gato", link: null },
      { questionId: wr, choice: null, text: "Long text", link: null },
      { questionId: sp, choice: null, text: "note", link: "https://youtu.be/abc" },
    ]);
  });

  it("keeps only the part that belongs to the kind of question", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    const [c, s, wr, sp] = w.questions.map((q) => q.id) as [string, string, string, string];
    const sneaky = { choice: 1, text: "sneaky", link: "https://x.example" };
    const res = await draft(kid, w.id, [
      { questionId: c, ...sneaky },
      { questionId: s, ...sneaky },
      { questionId: wr, ...sneaky },
      { questionId: sp, ...sneaky },
    ]);
    expect(res.json.work.answers).toEqual([
      { questionId: c, choice: 1, text: "", link: null },
      { questionId: s, choice: null, text: "sneaky", link: null },
      { questionId: wr, choice: null, text: "sneaky", link: null },
      { questionId: sp, choice: null, text: "sneaky", link: "https://x.example" },
    ]);
  });

  it("checks each answer: a choice on the list, https links, the length of the text", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    const [c, s, wr, sp] = w.questions.map((q) => q.id) as [string, string, string, string];
    const bad: [string, unknown[]][] = [
      ["a choice that is not on the list", [a.choice(c, 3)]],
      ["a short answer that is too long", [a.text(s, "x".repeat(501))]],
      ["a written answer that is too long", [a.text(wr, "x".repeat(10001))]],
      ["a note that is too long", [a.video(sp, "https://youtu.be/a", "x".repeat(2001))]],
      ["an http link", [a.video(sp, "http://x.example/v")]],
      ["a link that runs code", [a.video(sp, "javascript:alert(1)")]],
      ["a link with a password", [a.video(sp, "https://u:p@x.example")]],
      ["text that is not a link", [a.video(sp, "video.example.com")]],
      ["a question of another homework", [a.text("q_other", "x")]],
      ["the same question twice", [a.text(wr, "a"), a.text(wr, "b")]],
      ["more than 50 answers", Array.from({ length: 51 }, () => a.text(wr, "x"))],
    ];
    for (const [label, answers] of bad) expect((await draft(kid, w.id, answers)).status, label).toBe(400);
    expect((await myWork(kid))[0]!.status).toBe("not_started"); // nothing was saved
  });
});

describe("handing in", () => {
  it("hands in work with a question for the teacher: status, time, not late, and a result for the rest", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    await draft(kid, w.id, fullAnswers(w.questions));
    const res = await submit(kid, w.id, fullAnswers(w.questions));
    expect(res.status).toBe(200);
    expect(res.json.work).toMatchObject({
      status: "submitted",
      isLate: false,
      canEdit: false,
      blocked: "handed_in",
      score: null,
    });
    expect(res.json.work.submittedAt).toMatch(/^\d{4}-/);
  });

  it("can hand in without saving a draft first", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    expect((await submit(kid, w.id, fullAnswers(w.questions))).json.work.status).toBe("submitted");
  });

  it("asks for an answer to every question, and says which one", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    const [c, s, wr, sp] = w.questions.map((q) => q.id) as [string, string, string, string];
    const full = [a.choice(c, 0), a.text(s, "x"), a.text(wr, "x"), a.video(sp, "https://youtu.be/a")];
    const missing: [string, unknown[], string][] = [
      ["no choice", [a.choice(c, null), ...full.slice(1)], "Question 1"],
      ["a blank short answer", [full[0], a.text(s, "   "), ...full.slice(2)], "Question 2"],
      ["a blank written answer", [...full.slice(0, 2), a.text(wr, ""), full[3]], "Question 3"],
      ["a note without the link", [...full.slice(0, 3), a.video(sp, null, "only a note")], "Question 4"],
      ["a missing question", full.slice(0, 3), "Question 4"],
    ];
    for (const [label, answers, which] of missing) {
      const res = await submit(kid, w.id, answers);
      expect(res.status, label).toBe(400);
      expect(res.json.error.fields.answers, label).toContain(which);
    }
    expect((await submit(kid, w.id, full)).status).toBe(200);
  });

  it("cannot be handed in twice or changed afterwards, and the first answer stays", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    const q = w.questions[0]!.id;
    await submit(kid, w.id, [a.text(q, "Original")]);
    expect((await submit(kid, w.id, [a.text(q, "Changed")])).status).toBe(409);
    expect((await draft(kid, w.id, [a.text(q, "Changed")])).status).toBe(409);
    expect((await myWorkDetail(kid, w.id)).json.work.answers[0].text).toBe("Original");
  });

  it("two hand-ins at the same moment: one wins", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    const q = w.questions[0]!.id;
    const results = await Promise.all([
      submit(kid, w.id, [a.text(q, "A")]),
      submit(kid, w.id, [a.text(q, "B")]),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", w.id)).toBe(1);
  });

  it("writes to the audit log, and says whether the system scored it all", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    await submit(kid, w.id, fullAnswers(w.questions));
    const row = await env.DB.prepare(
      "SELECT meta FROM audit_log WHERE tenant_id = ? AND action = 'submission.handed_in' AND target_id = ?",
    )
      .bind(t.tenantId, w.id)
      .first<{ meta: string }>();
    expect(JSON.parse(row!.meta)).toEqual({ scored_by_system: false });
  });
});

describe("the system scores the questions that have a correct answer", () => {
  it("scores a quiz at once and returns it: the student sees the result, question by question", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, quiz()); // 2 + 1 + 2 = 5 points
    const [q1, q2, q3] = w.questions.map((q) => q.id) as [string, string, string];
    const res = await submit(kid, w.id, [a.choice(q1, 1), a.choice(q2, 0), a.text(q3, "  WENT ")]);
    expect(res.status).toBe(200);
    expect(res.json.work).toMatchObject({ status: "returned", score: 4, maxScore: 5, canEdit: false });
    expect(res.json.work.results).toEqual({
      perQuestion: [
        { questionId: q1, correct: true, awarded: 2, correctAnswer: "goes", note: "" },
        { questionId: q2, correct: false, awarded: 0, correctAnswer: "are", note: "" },
        { questionId: q3, correct: true, awarded: 2, correctAnswer: "went", note: "" },
      ],
      autoAwarded: 4,
      autoMax: 5,
      waitingForTeacher: 0,
    });
    // it stays the same when the student opens it again, and shows in the list
    expect((await myWorkDetail(kid, w.id)).json.work.results.autoAwarded).toBe(4);
    expect((await myWork(kid))[0]).toMatchObject({ status: "returned", score: 4 });
  });

  it("a wrong answer gives 0 and shows the correct one", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, homework({ questions: [choice("Q", ["a", "b"], 0, 3)] }));
    const res = await submit(kid, w.id, [a.choice(w.questions[0]!.id, 1)]);
    expect(res.json.work).toMatchObject({
      score: 0,
      results: { perQuestion: [{ correct: false, awarded: 0, correctAnswer: "a" }] },
    });
  });

  it("scores the first answer (number 0) as a real answer", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, homework({ questions: [choice("Q", ["a", "b"], 0, 3)] }));
    expect((await submit(kid, w.id, [a.choice(w.questions[0]!.id, 0)])).json.work.score).toBe(3);
  });

  it("scores half points", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(
      t,
      course.id,
      homework({ questions: [choice("A", ["x", "y"], 0, 1.5), short("B", ["z"], 0.5)] }),
    );
    const [q1, q2] = w.questions.map((q) => q.id) as [string, string];
    expect((await submit(kid, w.id, [a.choice(q1, 0), a.text(q2, "z")])).json.work.score).toBe(2);
  });

  it("with questions for the teacher too, the student sees the scored part now and waits for the rest", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed()); // choice 2, short 3, written 5, speaking 5
    const [c, s, wr, sp] = w.questions.map((q) => q.id) as [string, string, string, string];
    const res = await submit(kid, w.id, [
      a.choice(c, 2),
      a.text(s, "perro"),
      a.text(wr, "My family is small."),
      a.video(sp, "https://youtu.be/hi"),
    ]);
    expect(res.json.work).toMatchObject({ status: "submitted", score: null, canEdit: false });
    expect(res.json.work.results).toEqual({
      perQuestion: [
        { questionId: c, correct: true, awarded: 2, correctAnswer: "c", note: "" },
        { questionId: s, correct: false, awarded: 0, correctAnswer: "gato", note: "" },
        { questionId: wr, correct: null, awarded: null, correctAnswer: null, note: "" },
        { questionId: sp, correct: null, awarded: null, correctAnswer: null, note: "" },
      ],
      autoAwarded: 2,
      autoMax: 5,
      waitingForTeacher: 2,
    });
  });

  it("a choice question with no correct answer, or a short one with no accepted answers, is for the teacher", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(
      t,
      course.id,
      homework({ questions: [choice("Q", ["a", "b"], null, 2), short("S", [], 2)] }),
    );
    const [q1, q2] = w.questions.map((q) => q.id) as [string, string];
    const res = await submit(kid, w.id, [a.choice(q1, 0), a.text(q2, "anything")]);
    expect(res.json.work).toMatchObject({
      status: "submitted",
      results: { autoAwarded: 0, autoMax: 0, waitingForTeacher: 2 },
    });
  });

  it("a returned quiz goes to nobody's queue, and a mixed one goes to the teacher's", async () => {
    const { t, course, kid } = await setup();
    const q = await publish(t, course.id, quiz());
    const m = await publish(t, course.id, mixed());
    await submit(kid, q.id, [
      a.choice(q.questions[0]!.id, 1),
      a.choice(q.questions[1]!.id, 1),
      a.text(q.questions[2]!.id, "went"),
    ]);
    await submit(kid, m.id, fullAnswers(m.questions));
    const queue = (await call("/api/grading/queue", { cookie: t.cookie })).json.queue;
    expect(queue.map((i: { assignmentId: string }) => i.assignmentId)).toEqual([m.id]);
  });

  it("the answers of a returned quiz are kept with the points of each question", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, quiz());
    await submit(kid, w.id, [
      a.choice(w.questions[0]!.id, 1),
      a.choice(w.questions[1]!.id, 1),
      a.text(w.questions[2]!.id, "went"),
    ]);
    const row = await subRow(w.id, kid.studentId);
    expect(JSON.parse(row!.question_points as string)).toEqual({
      [w.questions[0]!.id]: 2,
      [w.questions[1]!.id]: 1,
      [w.questions[2]!.id]: 2,
    });
    expect(row).toMatchObject({ status: "returned", score: 5 });
    expect(row!.returned_at).not.toBeNull();
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
    const w = await publish(t, course.id);
    const q = w.questions[0]!.id;
    await draft(kid, w.id, [a.text(q, "Saved before")]);
    await pastDue(w.id);
    const late = await submit(kid, w.id, [a.text(q, "x")]);
    expect(late.status).toBe(409);
    expect(late.json.error.code).toBe("DEADLINE_PASSED");
    expect((await draft(kid, w.id, [a.text(q, "Too late")])).json.error.code).toBe("DEADLINE_PASSED");
    expect((await myWorkDetail(kid, w.id)).json.work).toMatchObject({
      canEdit: false,
      blocked: "deadline",
      answers: [{ text: "Saved before" }],
    });
    expect((await subRow(w.id, kid.studentId))!.status).toBe("drafted");
  });

  it("takes late work when the teacher allows it, and marks it late", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, homework({ allowLate: true }));
    await pastDue(w.id);
    const res = await submit(kid, w.id, fullAnswers(w.questions));
    expect(res.status).toBe(200);
    expect(res.json.work).toMatchObject({ status: "submitted", isLate: true });
  });

  it("takes work in time when there is no due date", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, homework({ dueDate: null, dueTime: null }));
    expect((await submit(kid, w.id, fullAnswers(w.questions))).json.work.isLate).toBe(false);
  });

  it("gives one student more time, and shows that time to them", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const w = await publish(t, course.id);
    await pastDue(w.id);
    const until = new Date(Date.now() + 86_400_000).toISOString();
    await setSql(
      "INSERT INTO submission_extensions (assignment_id, student_id, tenant_id, until_at) VALUES (?, ?, ?, ?)",
      w.id,
      kid.studentId,
      t.tenantId,
      until,
    );
    const res = await submit(kid, w.id, fullAnswers(w.questions));
    expect(res.status).toBe(200);
    expect(res.json.work.isLate).toBe(false);
    expect(res.json.work.dueAt).toBe(until);
    expect((await submit(other, w.id, fullAnswers(w.questions))).status).toBe(409);
  });

  it("an extension that has run out does not help", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    await pastDue(w.id);
    await setSql(
      "INSERT INTO submission_extensions (assignment_id, student_id, tenant_id, until_at) VALUES (?, ?, ?, ?)",
      w.id,
      kid.studentId,
      t.tenantId,
      new Date(Date.now() - 1000).toISOString(),
    );
    expect((await submit(kid, w.id, fullAnswers(w.questions))).json.error.code).toBe("DEADLINE_PASSED");
  });

  it("refuses work the teacher closed, but shows it", async () => {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id);
    await call(`/api/assignments/${w.id}/close`, { method: "POST", cookie: t.cookie, body: {} });
    expect((await submit(kid, w.id, fullAnswers(w.questions))).status).toBe(409);
    expect((await myWorkDetail(kid, w.id)).json.work).toMatchObject({
      blocked: "closed",
      assignmentStatus: "closed",
    });
  });
});

describe("scores of questions the teacher scores stay hidden until the work is returned", () => {
  async function graded(status: string, feedback = "Well done") {
    const { t, course, kid } = await setup();
    const w = await publish(t, course.id, mixed());
    await submit(kid, w.id, fullAnswers(w.questions));
    const pts = Object.fromEntries(w.questions.map((q) => [q.id, q.points]));
    await setSql(
      "UPDATE submissions SET status = ?, score = 15, feedback = ?, question_points = ? WHERE assignment_id = ?",
      status,
      feedback,
      JSON.stringify(pts),
      w.id,
    );
    return { w, kid };
  }

  it("hides the teacher's points, the total and the feedback while submitted or scored", async () => {
    for (const status of ["submitted", "graded"]) {
      const { w, kid } = await graded(status);
      const work = (await myWorkDetail(kid, w.id)).json.work;
      expect(work, status).toMatchObject({ status, score: null, feedback: "" });
      const [c, s, wr, sp] = work.results.perQuestion;
      expect(c.awarded).not.toBeNull(); // the questions the system scored show
      expect([wr.awarded, sp.awarded]).toEqual([null, null]); // the teacher's do not
      expect(work.results.waitingForTeacher).toBe(2);
      void s;
      expect((await myWork(kid))[0]!.score).toBeNull();
    }
  });

  it("shows every point, the total and the feedback once returned", async () => {
    const { w, kid } = await graded("returned");
    const work = (await myWorkDetail(kid, w.id)).json.work;
    expect(work).toMatchObject({ status: "returned", score: 15, feedback: "Well done", canEdit: false });
    expect(work.results.perQuestion.map((x: { awarded: number }) => x.awarded)).toEqual([2, 3, 5, 5]);
    expect(work.results.waitingForTeacher).toBe(0);
  });

  it("shows the reason (but no score) when asked to do it again, hides the correct answers again, and lets the student try again", async () => {
    const { w, kid } = await graded("revision_requested", "Add more detail");
    const res = await myWorkDetail(kid, w.id);
    expect(res.json.work).toMatchObject({
      status: "revision_requested",
      score: null,
      feedback: "Add more detail",
      canEdit: true,
      results: null,
    });
    expect(JSON.stringify(res.json.work.questions)).not.toMatch(/accepted|correct/); // the answer key is hidden again
    expect((await draft(kid, w.id, [a.text(w.questions[2]!.id, "Better")])).json.work.status).toBe(
      "revision_requested",
    );
    const again = await submit(kid, w.id, fullAnswers(w.questions));
    expect(again.status).toBe(200);
    expect(again.json.work.status).toBe("submitted");
    expect(await count("SELECT revision_count AS n FROM submissions WHERE assignment_id = ?", w.id)).toBe(1);
  });

  it("a new hand-in gives the system's points again and clears the old total", async () => {
    const { w, kid } = await graded("revision_requested");
    await submit(kid, w.id, [
      a.choice(w.questions[0]!.id, 0),
      a.text(w.questions[1]!.id, "perro"),
      a.text(w.questions[2]!.id, "x"),
      a.video(w.questions[3]!.id, "https://youtu.be/a"),
    ]);
    const row = await subRow(w.id, kid.studentId);
    expect(row!.score).toBeNull();
    expect(JSON.parse(row!.question_points as string)).toEqual({
      [w.questions[0]!.id]: 0,
      [w.questions[1]!.id]: 0,
    });
  });
});

describe("students cannot reach each other's work", () => {
  it("each student has their own answer for the same work", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const w = await publish(t, course.id);
    const q = w.questions[0]!.id;
    await draft(kid, w.id, [a.text(q, "Hoa's answer")]);
    await draft(other, w.id, [a.text(q, "Nam's answer")]);
    expect((await myWorkDetail(kid, w.id)).json.work.answers[0].text).toBe("Hoa's answer");
    expect((await myWorkDetail(other, w.id)).json.work.answers[0].text).toBe("Nam's answer");
    await submit(other, w.id, [a.text(q, "Nam's answer")]);
    expect((await myWorkDetail(kid, w.id)).json.work).toMatchObject({ status: "drafted", canEdit: true });
  });

  it("a student of another teacher gets 'not found' for this work, and cannot write to it", async () => {
    const { t, course } = await setup();
    const w = await publish(t, course.id);
    const teacher2 = await createTeacher();
    const course2 = await createCourse(teacher2, { maxStudents: null });
    const stranger = await joinedKid(teacher2, course2.id, "Stranger");
    expect((await myWorkDetail(stranger, w.id)).status).toBe(404);
    expect((await draft(stranger, w.id, [])).status).toBe(404);
    expect((await submit(stranger, w.id, fullAnswers(w.questions))).status).toBe(404);
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", w.id)).toBe(0);
  });

  it("a student of the same teacher who is not in the course cannot see or write to the work", async () => {
    const { t, course } = await setup();
    const w = await publish(t, course.id);
    const otherCourse = await createCourse(t, { maxStudents: null });
    const outsider = await joinedKid(t, otherCourse.id, "Outsider");
    expect((await myWorkDetail(outsider, w.id)).status).toBe(404);
    expect((await submit(outsider, w.id, fullAnswers(w.questions))).status).toBe(404);
    expect(await count("SELECT COUNT(*) AS n FROM submissions WHERE assignment_id = ?", w.id)).toBe(0);
  });

  it("work chosen for another student cannot be seen or answered", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const w = await publish(
      t,
      course.id,
      homework({ targetMode: "selected", studentIds: [other.studentId] }),
    );
    expect((await myWorkDetail(kid, w.id)).status).toBe(404);
    expect((await submit(kid, w.id, fullAnswers(w.questions))).status).toBe(404);
  });

  it("ignores a student, tenant, status or score sent in the body", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const w = await publish(t, course.id);
    const res = await call(`/api/my/work/${w.id}/draft`, {
      method: "PUT",
      cookie: kid.cookie,
      body: {
        answers: [a.text(w.questions[0]!.id, "x")],
        studentId: other.studentId,
        tenantId: "x",
        status: "returned",
        score: 10,
        feedback: "Great",
        points: { x: 10 },
      },
    });
    expect(res.status).toBe(200);
    expect(await subRow(w.id, other.studentId)).toBeNull();
    expect(await subRow(w.id, kid.studentId)).toMatchObject({ status: "drafted", score: null, feedback: "" });
  });

  it("the write itself is tied to the student's own account, even when called directly", async () => {
    const { t, course, kid } = await setup();
    const other = await joinedKid(t, course.id, "Nam");
    const w = await publish(t, course.id);
    const write = (userId: string) =>
      saveAnswerStatement(env.DB, {
        id: crypto.randomUUID(),
        userId,
        tenantId: t.tenantId,
        studentId: kid.studentId,
        assignmentId: w.id,
        status: "drafted",
        responses: [],
        points: {},
        score: null,
      }).run();
    expect((await write(other.userId)).meta.changes).toBe(0); // Nam's account cannot write Hoa's answer
    expect((await write(kid.userId)).meta.changes).toBe(1);
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
        (await call(path, { method, cookie: t.cookie, body: method === "GET" ? undefined : { answers: [] } }))
          .status,
        path,
      ).toBe(403);
    }
  });
});

void short;
void speaking;
export type { Person, Kid };
