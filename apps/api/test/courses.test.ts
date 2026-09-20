import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, createCourse, createTeacher, validCourse } from "./helpers";

describe("create and read courses", () => {
  it("creates a draft course in the teacher's own tenant", async () => {
    const t = await createTeacher();
    const res = await call("/api/courses", { method: "POST", cookie: t.cookie, body: validCourse() });
    expect(res.status).toBe(201);
    expect(res.json.course).toMatchObject({
      name: "English A1",
      pricePerLesson: 150000,
      status: "draft",
      version: 1,
      startDate: "2026-10-01",
      maxStudents: 10,
    });
    const row = await env.DB.prepare("SELECT tenant_id FROM courses WHERE id = ?")
      .bind(res.json.course.id)
      .first<{ tenant_id: string }>();
    expect(row?.tenant_id).toBe(t.tenantId);
  });

  it("can open the course right away, and refuses a status that is not draft or active", async () => {
    const t = await createTeacher();
    const open = await call("/api/courses", {
      method: "POST",
      cookie: t.cookie,
      body: { ...validCourse(), status: "active" },
    });
    expect(open.status, JSON.stringify(open.json)).toBe(201);
    expect(open.json.course.status).toBe("active");
    const draft = await call("/api/courses", {
      method: "POST",
      cookie: t.cookie,
      body: { ...validCourse(), status: "draft" },
    });
    expect(draft.json.course.status).toBe("draft");
    // A new course cannot start as archived (or as anything else).
    for (const status of ["archived", "open", ""]) {
      const bad = await call("/api/courses", {
        method: "POST",
        cookie: t.cookie,
        body: { ...validCourse(), status },
      });
      expect(bad.status, status).toBe(400);
    }
  });

  it("ignores a tenant id sent in the body (the tenant comes from the session)", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const res = await call("/api/courses", {
      method: "POST",
      cookie: a.cookie,
      body: { ...validCourse(), tenantId: b.tenantId },
    });
    expect(res.status).toBe(201);
    const row = await env.DB.prepare("SELECT tenant_id FROM courses WHERE id = ?")
      .bind(res.json.course.id)
      .first<{ tenant_id: string }>();
    expect(row?.tenant_id).toBe(a.tenantId);
  });

  it("lists only my courses, newest first, and hides archived ones by default", async () => {
    const t = await createTeacher();
    const other = await createTeacher();
    const first = await createCourse(t, { name: "First" });
    const second = await createCourse(t, { name: "Second" });
    await createCourse(other, { name: "Not mine" });
    await call(`/api/courses/${first.id}/archive`, { method: "POST", cookie: t.cookie });

    const list = await call("/api/courses", { cookie: t.cookie });
    expect(list.json.courses.map((c: { name: string }) => c.name)).toEqual(["Second"]);
    const all = await call("/api/courses?archived=1", { cookie: t.cookie });
    expect(all.json.courses.map((c: { name: string }) => c.name).sort()).toEqual(["First", "Second"]);
    expect(second.id).toBeDefined();
  });

  it("gets one course", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    const res = await call(`/api/courses/${c.id}`, { cookie: t.cookie });
    expect(res.json.course.id).toBe(c.id);
    expect((await call("/api/courses/does-not-exist", { cookie: t.cookie })).status).toBe(404);
  });
});

describe("course validation", () => {
  const post = (cookie: string, over: Record<string, unknown>) =>
    call("/api/courses", { method: "POST", cookie, body: validCourse(over) });

  it("refuses a missing name, a negative or fractional price, and a huge price", async () => {
    const t = await createTeacher();
    expect((await post(t.cookie, { name: "  " })).json.error.fields.name).toBeDefined();
    expect((await post(t.cookie, { pricePerLesson: -1 })).json.error.fields.pricePerLesson).toBeDefined();
    expect((await post(t.cookie, { pricePerLesson: 100.5 })).json.error.fields.pricePerLesson).toMatch(
      /whole number/,
    );
    expect((await post(t.cookie, { pricePerLesson: 999_999_999 })).status).toBe(400);
    expect((await post(t.cookie, { pricePerLesson: "150000" })).status).toBe(400);
  });

  it("refuses bad dates and an end date before the start date", async () => {
    const t = await createTeacher();
    expect((await post(t.cookie, { startDate: "2026-02-30" })).json.error.fields.startDate).toBeDefined();
    expect((await post(t.cookie, { startDate: "tomorrow" })).status).toBe(400);
    const order = await post(t.cookie, { startDate: "2026-12-31", endDate: "2026-10-01" });
    expect(order.status).toBe(400);
    expect(order.json.error.fields.endDate).toMatch(/cannot be before/);
  });

  it("allows a free course and no dates", async () => {
    const t = await createTeacher();
    const res = await post(t.cookie, {
      pricePerLesson: 0,
      startDate: null,
      endDate: null,
      maxStudents: null,
    });
    expect(res.status).toBe(201);
  });

  it("refuses too many students and too long text", async () => {
    const t = await createTeacher();
    expect((await post(t.cookie, { maxStudents: 0 })).status).toBe(400);
    expect((await post(t.cookie, { maxStudents: 5000 })).status).toBe(400);
    expect((await post(t.cookie, { description: "x".repeat(2001) })).status).toBe(400);
  });

  it("treats html in text as plain text (stored as typed, escaped when shown)", async () => {
    const t = await createTeacher();
    const res = await post(t.cookie, { name: "<script>alert(1)</script>" });
    expect(res.status).toBe(201);
    expect(res.json.course.name).toBe("<script>alert(1)</script>");
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

describe("update with version check", () => {
  const put = (cookie: string, id: string, body: Record<string, unknown>) =>
    call(`/api/courses/${id}`, { method: "PUT", cookie, body });

  it("saves and moves the version up by one", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    const res = await put(t.cookie, c.id, { ...validCourse({ name: "Renamed" }), version: c.version });
    expect(res.status).toBe(200);
    expect(res.json.course).toMatchObject({ name: "Renamed", version: 2 });
  });

  it("refuses a save made from an old version (someone else saved first)", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    await put(t.cookie, c.id, { ...validCourse({ name: "First save" }), version: 1 });
    const stale = await put(t.cookie, c.id, { ...validCourse({ name: "Old page" }), version: 1 });
    expect(stale.status).toBe(409);
    expect(stale.json.error.code).toBe("CONFLICT");
    const now = await call(`/api/courses/${c.id}`, { cookie: t.cookie });
    expect(now.json.course.name).toBe("First save");
  });

  it("lets only one of two simultaneous saves win", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    const results = await Promise.all(
      ["A", "B", "C"].map((n) => put(t.cookie, c.id, { ...validCourse({ name: n }), version: 1 })),
    );
    expect(results.filter((r) => r.status === 200).length).toBe(1);
    expect(results.filter((r) => r.status === 409).length).toBe(2);
  });

  it("can start a course (draft to active) and pause it again", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    const started = await put(t.cookie, c.id, { ...validCourse(), version: 1, status: "active" });
    expect(started.json.course.status).toBe("active");
    const paused = await put(t.cookie, c.id, { ...validCourse(), version: 2, status: "draft" });
    expect(paused.json.course.status).toBe("draft");
  });

  it("does not let update set the status to archived", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    expect((await put(t.cookie, c.id, { ...validCourse(), version: 1, status: "archived" })).status).toBe(
      400,
    );
  });

  it("refuses to edit an archived course", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    await call(`/api/courses/${c.id}/archive`, { method: "POST", cookie: t.cookie });
    const res = await put(t.cookie, c.id, { ...validCourse(), version: 2 });
    expect(res.status).toBe(409);
  });
});

describe("archive and restore", () => {
  it("archives, then restores as a draft, and can be undone either way only once", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    await call(`/api/courses/${c.id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { ...validCourse(), version: 1, status: "active" },
    });
    const archived = await call(`/api/courses/${c.id}/archive`, { method: "POST", cookie: t.cookie });
    expect(archived.json.course.status).toBe("archived");
    expect((await call(`/api/courses/${c.id}/archive`, { method: "POST", cookie: t.cookie })).status).toBe(
      409,
    );
    const restored = await call(`/api/courses/${c.id}/restore`, { method: "POST", cookie: t.cookie });
    expect(restored.json.course.status).toBe("draft");
    expect((await call(`/api/courses/${c.id}/restore`, { method: "POST", cookie: t.cookie })).status).toBe(
      409,
    );
  });

  it("writes audit rows without personal data", async () => {
    const t = await createTeacher();
    const c = await createCourse(t);
    await call(`/api/courses/${c.id}/archive`, { method: "POST", cookie: t.cookie });
    const rows = await env.DB.prepare(
      "SELECT action FROM audit_log WHERE tenant_id = ? AND target_id = ? ORDER BY at, id",
    )
      .bind(t.tenantId, c.id)
      .all<{ action: string }>();
    expect(rows.results.map((r) => r.action)).toEqual(["course.created", "course.archived"]);
  });
});

describe("one teacher can never reach another teacher's courses", () => {
  it("cannot read, change, archive or restore them, and they look like they do not exist", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    const c = await createCourse(a, { name: "Secret" });

    expect((await call(`/api/courses/${c.id}`, { cookie: b.cookie })).status).toBe(404);
    expect(
      (
        await call(`/api/courses/${c.id}`, {
          method: "PUT",
          cookie: b.cookie,
          body: { ...validCourse({ name: "Hacked" }), version: 1 },
        })
      ).status,
    ).toBe(404);
    expect((await call(`/api/courses/${c.id}/archive`, { method: "POST", cookie: b.cookie })).status).toBe(
      404,
    );
    expect((await call(`/api/courses/${c.id}/restore`, { method: "POST", cookie: b.cookie })).status).toBe(
      404,
    );
    expect((await call("/api/courses?archived=1", { cookie: b.cookie })).json.courses).toEqual([]);

    const still = await call(`/api/courses/${c.id}`, { cookie: a.cookie });
    expect(still.json.course).toMatchObject({ name: "Secret", version: 1, status: "draft" });
  });

  it("answers exactly the same for someone else's course as for one that does not exist", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const c = await createCourse(a);
    const mine = await call(`/api/courses/${c.id}`, { cookie: b.cookie });
    const missing = await call("/api/courses/00000000-0000-7000-8000-000000000000", { cookie: b.cookie });
    expect(mine.status).toBe(missing.status);
    expect(mine.json.error.code).toBe(missing.json.error.code);
    expect(mine.json.error.message).toBe(missing.json.error.message);
  });
});
