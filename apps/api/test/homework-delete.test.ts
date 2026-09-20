import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { runNotificationJobs } from "../src/notifications/jobs";
import { call, createCourse, createTeacher, type Person } from "./helpers";
import { fullAnswers, homework, joinedKid, mixed, myWork, myWorkDetail, publish, submit } from "./homework";

const remove = (t: Person, id: string) =>
  call(`/api/assignments/${id}`, { method: "DELETE", cookie: t.cookie });
const notes = async (p: Person) =>
  (
    (await call("/api/notifications", { cookie: p.cookie })).json.items as { kind: string; link: string }[]
  ).map((i) => `${i.kind} ${i.link}`);

async function setup() {
  const t = await createTeacher("Lan Tran");
  const course = await createCourse(t, { name: "English A1", maxStudents: null });
  const hoa = await joinedKid(t, course.id, "Hoa");
  const w = await publish(t, course.id, mixed());
  const answered = await submit(hoa, w.id, fullAnswers(w.questions as never));
  expect(answered.status, JSON.stringify(answered.json)).toBe(200);
  return { t, course, hoa, id: w.id };
}

describe("deleting homework", () => {
  it("hides it from the teacher and the student everywhere, even when work was handed in", async () => {
    const { t, course, hoa, id } = await setup();
    // Before: it is everywhere.
    expect((await call("/api/grading/queue", { cookie: t.cookie })).json.queue).toHaveLength(1);
    expect((await myWork(hoa)).map((w) => w.id)).toEqual([id]);
    expect(await notes(hoa)).toContain(`homework_new /my/work/${id}`);
    expect(await notes(t)).toContain(`work_handed_in /assignments/${id}/students/${hoa.studentId}`);

    expect((await remove(t, id)).status).toBe(200);

    // The teacher: not in the list, cannot open it or anything under it, and the scoring queue is empty.
    const list = await call(`/api/courses/${course.id}/assignments`, { cookie: t.cookie });
    expect(list.json.assignments).toEqual([]);
    for (const [method, path] of [
      ["GET", `/api/assignments/${id}`],
      ["GET", `/api/assignments/${id}/submissions`],
      ["GET", `/api/assignments/${id}/submissions/${hoa.studentId}`],
      ["POST", `/api/assignments/${id}/publish`],
      ["POST", `/api/assignments/${id}/close`],
    ] as const) {
      expect(
        (await call(path, method === "GET" ? { cookie: t.cookie } : { method, cookie: t.cookie, body: {} }))
          .status,
        `${method} ${path}`,
      ).toBe(404);
    }
    expect((await call("/api/grading/queue", { cookie: t.cookie })).json.queue).toEqual([]);
    const until = await call(`/api/assignments/${id}/extensions/${hoa.studentId}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { date: "2099-02-01", time: "20:00" },
    });
    expect(until.status).toBe(404);

    // The student: not in the list, cannot open it, save it or hand it in, and the notifications about it are gone.
    expect(await myWork(hoa)).toEqual([]);
    expect((await myWorkDetail(hoa, id)).status).toBe(404);
    expect((await submit(hoa, id, [])).status).toBe(404);
    expect(await notes(hoa)).not.toContain(`homework_new /my/work/${id}`);
    expect(await notes(t)).not.toContain(`work_handed_in /assignments/${id}/students/${hoa.studentId}`);
  });

  it("keeps what was handed in and the score history in the database, but hidden", async () => {
    const { t, id, hoa } = await setup();
    expect((await remove(t, id)).status).toBe(200);
    const row = await env.DB.prepare(
      "SELECT a.deleted_at, (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) AS subs FROM assignments a WHERE a.id = ?",
    )
      .bind(id)
      .first<{ deleted_at: string | null; subs: number }>();
    expect(row!.deleted_at).toMatch(/^\d{4}-/);
    expect(row!.subs).toBe(1);
    expect(hoa.studentId).toBeTruthy();
  });

  it("does not remind students of work that was deleted", async () => {
    const t = await createTeacher("Lan Tran");
    const course = await createCourse(t, { name: "English A1", maxStudents: null });
    const kid = await joinedKid(t, course.id, "Nam");
    const due = new Date(Date.now() + 12 * 3_600_000);
    const local = new Date(due.getTime() + 7 * 3_600_000).toISOString(); // Ho Chi Minh time
    const w = await publish(
      t,
      course.id,
      homework({ dueDate: local.slice(0, 10), dueTime: local.slice(11, 16) }),
    );
    expect((await remove(t, w.id)).status).toBe(200);
    await runNotificationJobs(env);
    expect((await notes(kid)).filter((n) => n.startsWith("homework_due"))).toEqual([]);
  });

  it("is only for the teacher who owns it, and is written to the audit log", async () => {
    const { t, id } = await setup();
    const other = await createTeacher("Mai Pham");
    expect((await remove(other, id)).status).toBe(404);
    expect((await call(`/api/assignments/${id}`, { cookie: t.cookie })).status).toBe(200); // still there
    expect((await remove(t, id)).status).toBe(200);
    const row = await env.DB.prepare(
      "SELECT meta FROM audit_log WHERE tenant_id = ? AND action = 'assignment.deleted' AND target_id = ?",
    )
      .bind(t.tenantId, id)
      .first<{ meta: string }>();
    expect(JSON.parse(row!.meta)).toEqual({ status: "published" });
    const anon = await call(`/api/assignments/${id}`, { method: "DELETE" });
    expect(anon.status).toBe(401);
  });
});
