import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { notesOf, setNoteVisibility } from "../src/repos/notes";
import { addStudent, call, createStudent, createTeacher, type Person } from "./helpers";

const add = (t: Person, studentId: string, over: Record<string, unknown> = {}) =>
  call(`/api/students/${studentId}/notes`, {
    method: "POST",
    cookie: t.cookie,
    body: { body: "Speaks more clearly now.", visibility: "student_visible", ...over },
  });
const list = async (t: Person, studentId: string) =>
  (await call(`/api/students/${studentId}/notes`, { cookie: t.cookie })).json.notes as {
    id: string;
    body: string;
    visibility: string;
    authorName: string;
  }[];
const setVisibility = (t: Person, studentId: string, noteId: string, visibility: string) =>
  call(`/api/students/${studentId}/notes/${noteId}`, {
    method: "PUT",
    cookie: t.cookie,
    body: { visibility },
  });

describe("notes about a student", () => {
  it("adds a note and lists the newest first, with the author's name", async () => {
    const t = await createTeacher("Lan Tran");
    const s = await addStudent(t);
    expect((await add(t, s.id, { body: "First", visibility: "private" })).status).toBe(201);
    const res = await add(t, s.id, { body: "Second" });
    expect(res.json.notes.map((n: { body: string }) => n.body)).toEqual(["Second", "First"]);
    expect(res.json.notes[0]).toMatchObject({ visibility: "student_visible", authorName: "Lan Tran" });
    expect(await list(t, s.id)).toHaveLength(2);
  });

  it("refuses empty, blank, too long notes and other visibilities", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    for (const over of [
      { body: "" },
      { body: "   " },
      { body: "x".repeat(2001) },
      { visibility: "public" },
      { visibility: undefined },
    ]) {
      expect((await add(t, s.id, over)).status, JSON.stringify(over).slice(0, 40)).toBe(400);
    }
    expect((await add(t, s.id, { body: "x".repeat(2000) })).status).toBe(201);
    expect(await list(t, s.id)).toHaveLength(1);
  });

  it("does not add notes to an archived student, but still shows the old ones", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    await add(t, s.id);
    await call(`/api/students/${s.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    expect((await add(t, s.id)).status).toBe(409);
    expect(await list(t, s.id)).toHaveLength(1);
  });

  it("does not show or accept notes for another teacher's student", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const s = await addStudent(a);
    await add(a, s.id, { body: "Private thing", visibility: "private" });
    expect((await call(`/api/students/${s.id}/notes`, { cookie: b.cookie })).status).toBe(404);
    expect((await add(b, s.id)).status).toBe(404);
    expect((await call("/api/students/made-up/notes", { cookie: b.cookie })).status).toBe(404);
    expect((await list(a, s.id)).map((n) => n.body)).toEqual(["Private thing"]);
  });

  it("can make a note private again, and only that", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    const note = (await add(t, s.id)).json.notes[0];
    const res = await setVisibility(t, s.id, note.id, "private");
    expect(res.status).toBe(200);
    expect(res.json.notes[0]).toMatchObject({ id: note.id, visibility: "private", body: note.body });
    expect((await setVisibility(t, s.id, note.id, "everyone")).status).toBe(400);
  });

  it("cannot change the visibility of another teacher's note, or of a note of another student", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const s1 = await addStudent(a);
    const s2 = await addStudent(a);
    const note = (await add(a, s1.id)).json.notes[0];
    expect((await setVisibility(b, s1.id, note.id, "private")).status).toBe(404);
    expect((await setVisibility(a, s2.id, note.id, "private")).status).toBe(404); // wrong student in the address
    expect((await setVisibility(a, s1.id, "made-up", "private")).status).toBe(404);
    expect((await list(a, s1.id))[0]!.visibility).toBe("student_visible");
  });

  it("the queries themselves stay inside one teacher's data, even when called directly", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const s = await addStudent(a);
    const note = (await add(a, s.id)).json.notes[0];
    expect(await notesOf(env.DB, b.tenantId, s.id)).toEqual([]);
    expect(await notesOf(env.DB, a.tenantId, s.id)).toHaveLength(1);
    const res = await setNoteVisibility(env.DB, b.tenantId, s.id, note.id, "private").run();
    expect(res.meta.changes).toBe(0);
    expect((await list(a, s.id))[0]!.visibility).toBe("student_visible");
  });

  it("the database keeps the history: no edit and no delete", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    const note = (await add(t, s.id)).json.notes[0];
    await expect(
      env.DB.prepare("UPDATE student_notes SET body = 'changed' WHERE id = ?").bind(note.id).run(),
    ).rejects.toThrow(/cannot be edited/);
    await expect(
      env.DB.prepare("DELETE FROM student_notes WHERE id = ?").bind(note.id).run(),
    ).rejects.toThrow(/kept/);
    await expect(
      env.DB.prepare("UPDATE student_notes SET student_id = ? WHERE id = ?").bind(s.id, note.id).run(),
    ).rejects.toThrow();
  });

  it("the database refuses a note that mixes tenants", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const s = await addStudent(b);
    await expect(
      env.DB.prepare(
        `INSERT INTO student_notes (id, tenant_id, student_id, author_user_id, visibility, body, created_at)
         VALUES ('n1', ?, ?, ?, 'private', 'x', 'x')`,
      )
        .bind(a.tenantId, s.id, a.userId)
        .run(),
    ).rejects.toThrow(/one tenant/);
  });

  it("writes to the audit log without the text of the note", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    const note = (await add(t, s.id, { body: "Secret words", visibility: "private" })).json.notes[0];
    await setVisibility(t, s.id, note.id, "student_visible");
    const rows = await env.DB.prepare(
      "SELECT action, meta FROM audit_log WHERE tenant_id = ? AND action LIKE 'note.%' ORDER BY at, id",
    )
      .bind(t.tenantId)
      .all<{ action: string; meta: string }>();
    expect(rows.results.map((r) => [r.action, JSON.parse(r.meta)])).toEqual([
      ["note.created", { visibility: "private" }],
      ["note.visibility_changed", { visibility: "student_visible" }],
    ]);
    expect(JSON.stringify(rows.results)).not.toContain("Secret words");
  });

  it("a student gets 403 and a signed out person 401", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    const kid = await createStudent(t);
    for (const [method, path, body] of [
      ["GET", `/api/students/${s.id}/notes`, undefined],
      ["POST", `/api/students/${s.id}/notes`, { body: "x", visibility: "private" }],
      ["PUT", `/api/students/${s.id}/notes/x`, { visibility: "private" }],
    ] as const) {
      expect((await call(path, { method, cookie: kid.cookie, body })).status, path).toBe(403);
      expect((await call(path, { method, body })).status, path).toBe(401);
    }
  });
});
