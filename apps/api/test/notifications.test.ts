import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/index";
import { runNotificationJobs } from "../src/notifications/jobs";
import { addStudent, call, createCourse, createTeacher, type Person } from "./helpers";
import { a, fullAnswers, homework, joinedKid, mixed, publish, submit } from "./homework";

const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
}
const mine = async (p: Person) =>
  (await call("/api/notifications", { cookie: p.cookie })).json as { items: Item[]; unread: number };
const kinds = async (p: Person) => (await mine(p)).items.map((i) => i.kind);
const setSql = (sql: string, ...args: unknown[]) =>
  env.DB.prepare(sql)
    .bind(...args)
    .run();

async function setup(body: Record<string, unknown> = mixed()) {
  const t = await createTeacher("Lan Tran");
  const course = await createCourse(t, { name: "English A1", maxStudents: null });
  const hoa = await joinedKid(t, course.id, "Hoa");
  const nam = await joinedKid(t, course.id, "Nam");
  const w = await publish(t, course.id, body);
  return { t, course, hoa, nam, id: w.id, qs: w.questions };
}
const gradeAndReturn = async (t: Person, id: string, studentId: string, qs: { id: string }[]) => {
  const points = { [qs[2]!.id]: 4, [qs[3]!.id]: 5 };
  await call(`/api/assignments/${id}/submissions/${studentId}/grade`, {
    method: "PUT",
    cookie: t.cookie,
    body: { points, feedback: "", version: 1 },
  });
  return call(`/api/assignments/${id}/submissions/${studentId}/return`, {
    method: "POST",
    cookie: t.cookie,
    body: { version: 2 },
  });
};

describe("telling students about new homework", () => {
  it("tells every student in the course who has an account, once, with a link to the work", async () => {
    const { hoa, nam, id, t } = await setup();
    for (const kid of [hoa, nam]) {
      const n = (await mine(kid)).items;
      expect(n).toHaveLength(1);
      expect(n[0]).toMatchObject({
        kind: "homework_new",
        title: "New homework: Unit 1 test",
        body: "English A1",
        link: `/my/work/${id}`,
        read: false,
      });
    }
    expect((await mine(t)).items).toEqual([]); // the teacher is not told about their own work
  });

  it("does not tell students who are not in the course, who are archived, who have no account yet, or (for chosen work) who were not chosen", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: null });
    const chosen = await joinedKid(t, course.id, "Chosen");
    const other = await joinedKid(t, course.id, "Other");
    const outsider = await joinedKid(t, (await createCourse(t, { maxStudents: null })).id, "Outsider");
    const archived = await joinedKid(t, course.id, "Archived");
    await call(`/api/students/${archived.studentId}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    const noAccount = await addStudent(t, { name: "No account" });
    await call(`/api/courses/${course.id}/students`, {
      method: "POST",
      cookie: t.cookie,
      body: { studentIds: [noAccount.id], customPrice: null },
    });
    await publish(
      t,
      course.id,
      homework({ title: "Chosen only", targetMode: "selected", studentIds: [chosen.studentId] }),
    );
    expect(await kinds(chosen)).toEqual(["homework_new"]);
    for (const p of [other, outsider, archived]) expect(await kinds(p), p.email).toEqual([]);
    await publish(t, course.id, homework({ title: "For everybody" }));
    expect(await kinds(other)).toEqual(["homework_new"]);
    expect(await kinds(archived)).toEqual([]);
    expect(await kinds(outsider)).toEqual([]);
    expect(await count("SELECT COUNT(*) AS n FROM notifications WHERE user_id IS NULL")).toBe(0);
  });

  it("says nothing for a draft, and nothing new when work is opened again after it was closed", async () => {
    const { t, hoa, id } = await setup();
    await call(`/api/assignments/${id}/close`, { method: "POST", cookie: t.cookie, body: {} });
    await call(`/api/assignments/${id}/publish`, { method: "POST", cookie: t.cookie, body: {} });
    expect(await kinds(hoa)).toEqual(["homework_new"]);
    const course = await createCourse(t, { maxStudents: null });
    await call(`/api/courses/${course.id}/assignments`, { method: "POST", cookie: t.cookie, body: mixed() });
    expect(await kinds(hoa)).toEqual(["homework_new"]);
  });
});

describe("the other events", () => {
  it("tells the teacher when a student hands in, with a link to the answer, and nobody else", async () => {
    const { t, hoa, nam, id, qs } = await setup();
    await submit(hoa, id, fullAnswers(qs));
    const n = (await mine(t)).items;
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({
      kind: "work_handed_in",
      title: "Hoa handed in work",
      body: "Unit 1 test · English A1",
      link: `/assignments/${id}/students/${hoa.studentId}`,
    });
    expect(await kinds(nam)).toEqual(["homework_new"]); // not told about Hoa
    expect(await kinds(hoa)).toEqual(["homework_new"]);
  });

  it("tells the student when the work is scored and returned, and when they are asked to do it again", async () => {
    const { t, hoa, nam, id, qs } = await setup();
    await submit(hoa, id, fullAnswers(qs));
    await submit(nam, id, fullAnswers(qs));
    expect((await gradeAndReturn(t, id, hoa.studentId, qs)).status).toBe(200);
    const again = await call(`/api/assignments/${id}/submissions/${nam.studentId}/request-revision`, {
      method: "POST",
      cookie: t.cookie,
      body: { feedback: "More detail", version: 1 },
    });
    expect(again.status).toBe(200);
    expect((await mine(hoa)).items.find((i) => i.kind === "homework_returned")).toMatchObject({
      title: "Your work was scored: Unit 1 test",
      link: `/my/work/${id}`,
    });
    expect((await mine(nam)).items.find((i) => i.kind === "homework_again")).toMatchObject({
      title: "Please change your work: Unit 1 test",
    });
    expect(await kinds(hoa)).not.toContain("homework_again");
    expect(await kinds(nam)).not.toContain("homework_returned");
  });

  it("tells the student about a new fee receipt, once", async () => {
    const t = await createTeacher("Lan Tran");
    const course = await createCourse(t, { pricePerLesson: 100_000, maxStudents: null });
    const kid = await joinedKid(t, course.id, "Hoa");
    const lesson = (
      await call(`/api/courses/${course.id}/lessons`, {
        method: "POST",
        cookie: t.cookie,
        body: {
          title: "L",
          date: "2020-01-06",
          startTime: "18:30",
          durationMinutes: 90,
          place: "",
          onlineUrl: null,
          repeatWeeks: 1,
        },
      })
    ).json.lessons[0];
    await call(`/api/lessons/${lesson.id}/attendance`, {
      method: "PUT",
      cookie: t.cookie,
      body: { records: [{ studentId: kid.studentId, status: "attended" }] },
    });
    await call("/api/invoices/generate", { method: "POST", cookie: t.cookie, body: { period: "2020-01" } });
    const inv = (await call("/api/invoices?period=2020-01", { cookie: t.cookie })).json.invoices[0];
    expect(await kinds(kid)).toEqual([]); // a draft is not told
    await call(`/api/invoices/${inv.id}/send`, { method: "POST", cookie: t.cookie, body: { version: 1 } });
    const n = (await mine(kid)).items;
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({
      kind: "receipt_sent",
      title: "New fee receipt: January 2020",
      link: `/my/invoices/${inv.id}`,
    });
  });
});

describe("reading and marking notifications", () => {
  it("shows only the person's own, newest first, and counts the unread", async () => {
    const { hoa, nam, t, id, qs } = await setup();
    await submit(hoa, id, fullAnswers(qs));
    expect((await mine(hoa)).unread).toBe(1);
    expect((await call("/api/notifications/unread", { cookie: hoa.cookie })).json).toEqual({ unread: 1 });
    await gradeAndReturn(t, id, hoa.studentId, qs);
    const list = await mine(hoa);
    expect(list.items.map((i) => i.kind)).toEqual(["homework_returned", "homework_new"]);
    expect(list.unread).toBe(2);
    expect((await mine(nam)).unread).toBe(1);
  });

  it("marks some or all as read, and never touches someone else's", async () => {
    const { hoa, nam, t, id, qs } = await setup();
    await submit(hoa, id, fullAnswers(qs));
    await gradeAndReturn(t, id, hoa.studentId, qs);
    const [first, second] = (await mine(hoa)).items;
    const someone = (await mine(nam)).items[0]!;
    const one = await call("/api/notifications/read", {
      method: "POST",
      cookie: hoa.cookie,
      body: { ids: [first!.id, someone.id] },
    });
    expect(one.json).toEqual({ unread: 1 });
    expect((await mine(nam)).unread).toBe(1); // Nam's is untouched
    expect((await mine(hoa)).items.find((i) => i.id === second!.id)!.read).toBe(false);
    const all = await call("/api/notifications/read", { method: "POST", cookie: hoa.cookie, body: {} });
    expect(all.json).toEqual({ unread: 0 });
    expect((await mine(nam)).unread).toBe(1);
    expect(
      (await call("/api/notifications/read", { method: "POST", cookie: hoa.cookie, body: { ids: "x" } }))
        .status,
    ).toBe(400);
  });

  it("is closed to a signed out person", async () => {
    for (const [method, path] of [
      ["GET", "/api/notifications"],
      ["GET", "/api/notifications/unread"],
      ["POST", "/api/notifications/read"],
    ] as const) {
      expect(
        (await call(path, { method, body: method === "GET" ? undefined : {} })).status,
        `${method} ${path}`,
      ).toBe(401);
    }
  });

  it("refuses, in the database, a notification for someone who is not in that teacher's classroom", async () => {
    const t = await createTeacher();
    const other = await createTeacher();
    await expect(
      setSql(
        "INSERT INTO notifications (id, tenant_id, user_id, kind, title, created_at) VALUES ('x', ?, ?, 'homework_new', 't', ?)",
        t.tenantId,
        other.userId,
        new Date().toISOString(),
      ),
    ).rejects.toThrow(/one tenant/);
  });
});

describe("the hourly job: reminders and cleaning", () => {
  // The job looks at everybody's work, so each test starts with none from other tests.
  beforeEach(async () => {
    await setSql("DELETE FROM notifications");
  });

  const dueIn = (hours: number, id: string) =>
    setSql(
      "UPDATE assignments SET due_at = ? WHERE id = ?",
      new Date(Date.now() + hours * 3_600_000).toISOString(),
      id,
    );

  it("reminds the students who did not hand in, once, and nobody else", async () => {
    const { hoa, nam, id, qs } = await setup();
    await submit(hoa, id, fullAnswers(qs)); // Hoa handed in
    await dueIn(10, id);
    await runNotificationJobs(env);
    expect((await mine(nam)).items.find((i) => i.kind === "homework_due")).toMatchObject({
      title: "Due soon: Unit 1 test",
      body: "English A1",
      link: `/my/work/${id}`,
    });
    expect(await kinds(hoa)).not.toContain("homework_due");
    await runNotificationJobs(env);
    expect((await kinds(nam)).filter((k) => k === "homework_due")).toHaveLength(1);
  });

  it("remembers a student who only saved a draft, and skips work that is far away, already past, or has no due date", async () => {
    const { t, course, hoa, id, qs } = await setup();
    await call(`/api/my/work/${id}/draft`, {
      method: "PUT",
      cookie: hoa.cookie,
      body: { answers: [a.text(qs[2]!.id, "half")] },
    });
    const far = (await publish(t, course.id, homework({ title: "Far" }))).id;
    const past = (await publish(t, course.id, homework({ title: "Past" }))).id;
    await publish(t, course.id, homework({ title: "No date" }));
    await dueIn(5, id);
    await dueIn(30, far);
    await dueIn(-2, past);
    await runNotificationJobs(env);
    const titles = (await mine(hoa)).items.filter((i) => i.kind === "homework_due").map((i) => i.title);
    expect(titles).toEqual(["Due soon: Unit 1 test"]);
  });

  it("does not remind about work that is closed, in a course that is archived, or for other students", async () => {
    const { t, course, hoa, id } = await setup();
    const chosen = await joinedKid(t, course.id, "Chosen");
    const only = (
      await publish(
        t,
        course.id,
        homework({ title: "Only Chosen", targetMode: "selected", studentIds: [chosen.studentId] }),
      )
    ).id;
    await dueIn(5, only);
    await call(`/api/assignments/${id}/close`, { method: "POST", cookie: t.cookie, body: {} });
    await dueIn(5, id);
    await runNotificationJobs(env);
    expect(await kinds(hoa)).not.toContain("homework_due");
    expect(await kinds(chosen)).toContain("homework_due");
    await setSql("UPDATE courses SET status = 'archived' WHERE id = ?", course.id);
    await setSql("DELETE FROM notifications WHERE kind = 'homework_due'");
    await runNotificationJobs(env);
    // (The job looks at everybody's work, so only the reminders for this course are counted.)
    expect(
      await count(
        "SELECT COUNT(*) AS n FROM notifications WHERE kind = 'homework_due' AND dedupe_key IN ('due:' || ?, 'due:' || ?)",
        id,
        only,
      ),
    ).toBe(0);
  });

  it("removes notifications older than 90 days and keeps newer ones", async () => {
    const { hoa } = await setup();
    const old = new Date(Date.now() - 91 * 86_400_000).toISOString();
    const recent = new Date(Date.now() - 80 * 86_400_000).toISOString();
    for (const [id, at] of [
      ["old", old],
      ["recent", recent],
    ] as const) {
      await setSql(
        "INSERT INTO notifications (id, tenant_id, user_id, kind, title, created_at) VALUES (?, ?, ?, 'homework_new', 't', ?)",
        id,
        hoa.tenantId,
        hoa.userId,
        at,
      );
    }
    await runNotificationJobs(env);
    const ids = (
      await env.DB.prepare("SELECT id FROM notifications WHERE id IN ('old','recent')").all<{ id: string }>()
    ).results.map((r) => r.id);
    expect(ids).toEqual(["recent"]);
  });

  it("runs from the schedule of the Worker, and sends no email", async () => {
    const { hoa, id } = await setup();
    await dueIn(5, id);
    const waiting: Promise<unknown>[] = [];
    await worker.scheduled!({} as never, env, {
      waitUntil: (p: Promise<unknown>) => waiting.push(p),
    } as never);
    await Promise.all(waiting);
    expect(await kinds(hoa)).toContain("homework_due");
    expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'notification'")).toBe(0);
  });
});
