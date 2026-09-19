import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  addStudent,
  call,
  createStudent,
  createTeacher,
  emailsTo,
  latestToken,
  uniqueEmail,
} from "./helpers";

const list = (cookie: string, query = "") => call(`/api/students${query}`, { cookie });

describe("add a student", () => {
  it("creates a profile with no invite and no email sent", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    const res = await call("/api/students", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "  Mai  ", email: email.toUpperCase(), phone: "0901 234 567" },
    });
    expect(res.status).toBe(201);
    expect(res.json.student).toMatchObject({
      name: "Mai",
      email,
      phone: "0901 234 567",
      access: "not_invited",
      archived: false,
      version: 1,
    });
    expect(await emailsTo(email)).toEqual([]);
  });

  it("can send the invite at the same time", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    const res = await call("/api/students", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "Mai", email, invite: true },
    });
    expect(res.status).toBe(201);
    expect(res.json.student.access).toBe("invited");
    expect((await emailsTo(email)).map((m) => m.kind)).toEqual(["invite"]);
  });

  it("does not save the student when the invite is refused", async () => {
    const t = await createTeacher();
    await env.DB.prepare("UPDATE users SET email_verified_at = NULL WHERE id = ?").bind(t.userId).run();
    const email = uniqueEmail("kid");
    const res = await call("/api/students", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "Mai", email, invite: true },
    });
    expect(res.json.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect((await list(t.cookie)).json.total).toBe(0);
  });

  it("refuses the same email twice and says so on the email field", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    const res = await call("/api/students", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "Again", email: s.email },
    });
    expect(res.status).toBe(400);
    expect(res.json.error.fields.email).toMatch(/already added/);
  });

  it("lets two teachers each add the same email", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const email = uniqueEmail("kid");
    expect(
      (await call("/api/students", { method: "POST", cookie: a.cookie, body: { name: "Mai", email } }))
        .status,
    ).toBe(201);
    expect(
      (await call("/api/students", { method: "POST", cookie: b.cookie, body: { name: "Mai", email } }))
        .status,
    ).toBe(201);
  });

  it("only one of two simultaneous adds of the same email wins", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        call("/api/students", { method: "POST", cookie: t.cookie, body: { name: "Mai", email } }),
      ),
    );
    expect(results.filter((r) => r.status === 201).length).toBe(1);
    expect(results.every((r) => r.status === 201 || r.status === 400)).toBe(true);
    expect((await list(t.cookie)).json.total).toBe(1);
  });

  it("refuses bad input with field errors", async () => {
    const t = await createTeacher();
    const res = await call("/api/students", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "", email: "nope", phone: "abc<script>" },
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.json.error.fields).sort()).toEqual(["email", "name", "phone"]);
  });
});

describe("student access state", () => {
  it("shows not invited, invited, then joined", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    expect((await call(`/api/students/${s.id}`, { cookie: t.cookie })).json.student.access).toBe(
      "not_invited",
    );
    await call("/api/invites", { method: "POST", cookie: t.cookie, body: { name: "Mai", email: s.email } });
    expect((await call(`/api/students/${s.id}`, { cookie: t.cookie })).json.student.access).toBe("invited");
    await call("/api/invites/accept", {
      method: "POST",
      body: { token: await latestToken(s.email, "invite") },
    });
    expect((await call(`/api/students/${s.id}`, { cookie: t.cookie })).json.student.access).toBe("joined");
  });

  it("a student who was only added (never invited) does not appear in the invite list", async () => {
    const t = await createTeacher();
    await addStudent(t);
    expect((await call("/api/invites", { cookie: t.cookie })).json.invites).toEqual([]);
  });

  it("a student created by the invite flow is visible in the student list", async () => {
    const t = await createTeacher();
    const s = await createStudent(t, "Joined Kid");
    const res = await list(t.cookie);
    expect(res.json.students).toMatchObject([{ email: s.email, name: "Joined Kid", access: "joined" }]);
  });
});

describe("list, search and pages", () => {
  it("sorts by name ignoring case, and counts the total", async () => {
    const t = await createTeacher();
    for (const name of ["bao", "Anh", "Chi"]) await addStudent(t, { name });
    const res = await list(t.cookie);
    expect(res.json.students.map((s: { name: string }) => s.name)).toEqual(["Anh", "bao", "Chi"]);
    expect(res.json).toMatchObject({ total: 3, page: 1, pageSize: 50 });
  });

  it("searches by name or email, ignoring case", async () => {
    const t = await createTeacher();
    await addStudent(t, { name: "Nguyen Van An", email: uniqueEmail("an") });
    await addStudent(t, { name: "Tran Binh", email: uniqueEmail("binh") });
    expect((await list(t.cookie, "?search=NGUYEN")).json.total).toBe(1);
    expect((await list(t.cookie, "?search=binh")).json.total).toBe(1);
    expect((await list(t.cookie, "?search=nobody")).json.total).toBe(0);
  });

  it("matches % and _ typed by the person literally instead of as wildcards", async () => {
    const t = await createTeacher();
    await addStudent(t, { name: "100% Effort" });
    await addStudent(t, { name: "Plain Name" });
    expect((await list(t.cookie, "?search=%25")).json.students.map((s: { name: string }) => s.name)).toEqual([
      "100% Effort",
    ]);
    expect((await list(t.cookie, "?search=_")).json.total).toBe(0);
    expect((await list(t.cookie, `?search=${encodeURIComponent("' OR 1=1 --")}`)).json.total).toBe(0);
  });

  it("splits into pages of 50", async () => {
    const t = await createTeacher();
    const rows = Array.from({ length: 55 }, (_, i) => ({
      name: `Kid ${String(i).padStart(2, "0")}`,
      email: uniqueEmail(`p${i}`),
    }));
    await call("/api/students/import", { method: "POST", cookie: t.cookie, body: { rows, dryRun: false } });
    const p1 = await list(t.cookie, "?page=1");
    const p2 = await list(t.cookie, "?page=2");
    expect(p1.json.students.length).toBe(50);
    expect(p2.json.students.length).toBe(5);
    expect(p1.json.total).toBe(55);
    expect((await list(t.cookie, "?page=abc")).json.page).toBe(1);
    expect((await list(t.cookie, "?page=-4")).json.page).toBe(1);
  });

  it("hides archived students unless asked", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    await call(`/api/students/${s.id}/archive`, { method: "POST", cookie: t.cookie });
    expect((await list(t.cookie)).json.total).toBe(0);
    const all = await list(t.cookie, "?archived=1");
    expect(all.json.students).toMatchObject([{ id: s.id, archived: true }]);
  });
});

describe("edit a student", () => {
  const put = (cookie: string, id: string, body: Record<string, unknown>) =>
    call(`/api/students/${id}`, { method: "PUT", cookie, body });

  it("saves the profile and the private note, and keeps the email", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    const res = await put(t.cookie, s.id, {
      name: "Mai Tran",
      phone: "0909",
      teacherNote: "Shy, needs speaking practice",
      version: 1,
    });
    expect(res.status).toBe(200);
    expect(res.json.student).toMatchObject({
      name: "Mai Tran",
      phone: "0909",
      teacherNote: "Shy, needs speaking practice",
      version: 2,
      email: s.email,
    });
  });

  it("refuses a save from an old version, and only one simultaneous save wins", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    const ok = await put(t.cookie, s.id, { name: "First", version: 1 });
    expect(ok.status).toBe(200);
    expect((await put(t.cookie, s.id, { name: "Stale", version: 1 })).status).toBe(409);
    const s2 = await addStudent(t);
    const results = await Promise.all(
      ["A", "B", "C"].map((n) => put(t.cookie, s2.id, { name: n, version: 1 })),
    );
    expect(results.filter((r) => r.status === 200).length).toBe(1);
  });

  it("archives and restores, restoring to the right state", async () => {
    const t = await createTeacher();
    const notJoined = await addStudent(t);
    const joined = await createStudent(t);
    const joinedId = (await list(t.cookie)).json.students.find(
      (s: { email: string }) => s.email === joined.email,
    ).id;

    for (const id of [notJoined.id, joinedId]) {
      expect(
        (await call(`/api/students/${id}/archive`, { method: "POST", cookie: t.cookie })).json.student
          .archived,
      ).toBe(true);
      expect((await call(`/api/students/${id}/archive`, { method: "POST", cookie: t.cookie })).status).toBe(
        409,
      );
      expect(
        (await call(`/api/students/${id}/restore`, { method: "POST", cookie: t.cookie })).json.student
          .archived,
      ).toBe(false);
    }
    const rows = await env.DB.prepare("SELECT id, status FROM students WHERE tenant_id = ? ORDER BY email")
      .bind(t.tenantId)
      .all<{ id: string; status: string }>();
    expect(Object.fromEntries(rows.results.map((r) => [r.id, r.status]))).toEqual({
      [notJoined.id]: "invited",
      [joinedId]: "active",
    });
  });

  it("an archived student cannot use an old invite link", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    await call("/api/invites", { method: "POST", cookie: t.cookie, body: { name: "Mai", email: s.email } });
    const token = await latestToken(s.email, "invite");
    await call(`/api/students/${s.id}/archive`, { method: "POST", cookie: t.cookie });
    expect((await call("/api/invites/accept", { method: "POST", body: { token } })).status).toBe(410);
  });

  it("refuses adding someone who is archived and points to restore", async () => {
    const t = await createTeacher();
    const s = await addStudent(t);
    await call(`/api/students/${s.id}/archive`, { method: "POST", cookie: t.cookie });
    const res = await call("/api/students", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "Mai", email: s.email },
    });
    expect(res.json.error.fields.email).toMatch(/Restore/);
  });
});

describe("CSV import", () => {
  const importRows = (cookie: string, rows: unknown[], dryRun: boolean) =>
    call("/api/students/import", { method: "POST", cookie, body: { rows, dryRun } });

  it("dry run checks every row and creates nothing", async () => {
    const t = await createTeacher();
    const existing = await addStudent(t);
    const dup = uniqueEmail("dup");
    const res = await importRows(
      t.cookie,
      [
        { name: "New One", email: uniqueEmail("n") },
        { name: "", email: uniqueEmail("x") },
        { name: "Bad Email", email: "nope" },
        { name: "Known", email: existing.email },
        { name: "Dup A", email: dup },
        { name: "Dup B", email: dup.toUpperCase() },
        { name: "Phone Bad", email: uniqueEmail("p"), phone: "abc" },
      ],
      true,
    );
    expect(res.status).toBe(200);
    expect(res.json.created).toBe(0);
    expect(res.json.rows.map((r: { row: number; result: string }) => `${r.row}:${r.result}`)).toEqual([
      "1:new",
      "2:invalid",
      "3:invalid",
      "4:exists",
      "5:new",
      "6:duplicate_in_list",
      "7:invalid",
    ]);
    expect((await list(t.cookie)).json.total).toBe(1);
  });

  it("creates the good rows and reports the rest, without inviting or emailing anyone", async () => {
    const t = await createTeacher();
    const good = uniqueEmail("good");
    const res = await importRows(
      t.cookie,
      [
        { name: "Good", email: good, phone: "0901" },
        { name: "", email: "nope" },
      ],
      false,
    );
    expect(res.json.created).toBe(1);
    expect(res.json.rows[1].result).toBe("invalid");
    const student = (await list(t.cookie)).json.students[0];
    expect(student).toMatchObject({ email: good, phone: "0901", access: "not_invited" });
    expect(await emailsTo(good)).toEqual([]);
  });

  it("running the same import twice creates nothing the second time", async () => {
    const t = await createTeacher();
    const rows = [
      { name: "A", email: uniqueEmail("a") },
      { name: "B", email: uniqueEmail("b") },
    ];
    expect((await importRows(t.cookie, rows, false)).json.created).toBe(2);
    const again = await importRows(t.cookie, rows, false);
    expect(again.json.created).toBe(0);
    expect(again.json.rows.every((r: { result: string }) => r.result === "exists")).toBe(true);
  });

  it("refuses an empty list and more than 200 rows", async () => {
    const t = await createTeacher();
    expect((await importRows(t.cookie, [], true)).status).toBe(400);
    const many = Array.from({ length: 201 }, (_, i) => ({ name: "K", email: `k${i}@example.com` }));
    expect((await importRows(t.cookie, many, true)).status).toBe(400);
  });

  it("checks 200 rows and creates them in one go", async () => {
    const t = await createTeacher();
    const rows = Array.from({ length: 200 }, (_, i) => ({
      name: `Kid ${i}`,
      email: uniqueEmail(`bulk${i}`),
    }));
    const res = await importRows(t.cookie, rows, false);
    expect(res.status).toBe(200);
    expect(res.json.created).toBe(200);
    expect((await list(t.cookie)).json.total).toBe(200);
  });

  it("treats an email that another teacher already has as new (tenants do not see each other)", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const shared = uniqueEmail("shared");
    await importRows(a.cookie, [{ name: "Kid", email: shared }], false);
    const res = await importRows(b.cookie, [{ name: "Kid", email: shared }], false);
    expect(res.json.rows[0].result).toBe("new");
    expect(res.json.created).toBe(1);
  });

  it("does not add anything to another teacher's list", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    await importRows(a.cookie, [{ name: "Only A", email: uniqueEmail("a") }], false);
    expect((await list(b.cookie)).json.total).toBe(0);
  });
});

describe("one teacher can never reach another teacher's students", () => {
  it("cannot read, edit, archive or restore them, and gets the same answer as for a missing student", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    const s = await addStudent(a, { name: "Secret Kid" });

    const missing = await call("/api/students/00000000-0000-7000-8000-000000000000", { cookie: b.cookie });
    const foreign = await call(`/api/students/${s.id}`, { cookie: b.cookie });
    expect(foreign.status).toBe(404);
    expect(foreign.json.error.message).toBe(missing.json.error.message);
    expect(
      (
        await call(`/api/students/${s.id}`, {
          method: "PUT",
          cookie: b.cookie,
          body: { name: "Hacked", version: 1 },
        })
      ).status,
    ).toBe(404);
    expect((await call(`/api/students/${s.id}/archive`, { method: "POST", cookie: b.cookie })).status).toBe(
      404,
    );
    expect((await call(`/api/students/${s.id}/restore`, { method: "POST", cookie: b.cookie })).status).toBe(
      404,
    );
    expect((await list(b.cookie, "?search=Secret")).json.total).toBe(0);

    const still = await call(`/api/students/${s.id}`, { cookie: a.cookie });
    expect(still.json.student).toMatchObject({ name: "Secret Kid", version: 1, archived: false });
  });

  it("students (role) cannot use any of these routes", async () => {
    const t = await createTeacher();
    const kid = await createStudent(t);
    expect((await list(kid.cookie)).status).toBe(403);
    expect(
      (
        await call("/api/students", {
          method: "POST",
          cookie: kid.cookie,
          body: { name: "X", email: uniqueEmail() },
        })
      ).status,
    ).toBe(403);
    expect((await call("/api/courses", { cookie: kid.cookie })).status).toBe(403);
  });
});
