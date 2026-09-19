import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, createStudent, createTeacher, emailsTo, latestToken, uniqueEmail } from "./helpers";

const invite = (cookie: string | undefined, email: string, name = "Sam") =>
  call("/api/invites", { method: "POST", cookie, body: { name, email } });

describe("teacher invites a student", () => {
  it("sends an invite email and lists it as sent", async () => {
    const t = await createTeacher("Ms Lan");
    const email = uniqueEmail("kid");
    expect((await invite(t.cookie, email)).status).toBe(202);
    const mails = await emailsTo(email);
    expect(mails.map((m) => m.kind)).toEqual(["invite"]);
    expect(mails[0]!.body_text).toContain("Ms Lan invited you");
    const list = await call("/api/invites", { cookie: t.cookie });
    expect(list.json.invites).toMatchObject([{ email, name: "Sam", state: "sent" }]);
  });

  it("needs the teacher's own email to be confirmed first", async () => {
    const t = await createTeacher();
    await env.DB.prepare("UPDATE users SET email_verified_at = NULL WHERE id = ?").bind(t.userId).run();
    const res = await invite(t.cookie, uniqueEmail());
    expect(res.status).toBe(403);
    expect(res.json.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("is refused for students and for people who are not signed in", async () => {
    const t = await createTeacher();
    const s = await createStudent(t);
    expect((await invite(s.cookie, uniqueEmail())).status).toBe(403);
    expect((await invite(undefined, uniqueEmail())).status).toBe(401);
    expect((await call("/api/invites", { cookie: s.cookie })).status).toBe(403);
  });

  it("refuses bad input with field errors", async () => {
    const t = await createTeacher();
    const res = await call("/api/invites", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "", email: "nope" },
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.json.error.fields).sort()).toEqual(["email", "name"]);
  });

  it("stops at 50 invites a day", async () => {
    const t = await createTeacher();
    const now = new Date().toISOString();
    const stmts = Array.from({ length: 50 }, (_, i) =>
      env.DB.prepare(
        "INSERT INTO auth_tokens (id, kind, token_hash, email, tenant_id, created_at, expires_at) VALUES (?, 'invite', ?, 'x@example.com', ?, ?, ?)",
      ).bind(`bulk-${t.tenantId}-${i}`, `hash-${t.tenantId}-${i}`, t.tenantId, now, now),
    );
    await env.DB.batch(stmts);
    const res = await invite(t.cookie, uniqueEmail());
    expect(res.status).toBe(429);
    expect(res.json.error.code).toBe("INVITE_LIMIT");
  });

  it("refuses to invite someone who already joined", async () => {
    const t = await createTeacher();
    const s = await createStudent(t);
    const res = await invite(t.cookie, s.email);
    expect(res.status).toBe(400);
    expect(res.json.error.fields.email).toMatch(/already joined/);
  });
});

describe("student accepts an invite", () => {
  it("creates the account, links the student and signs them in as a student", async () => {
    const t = await createTeacher();
    const s = await createStudent(t, "Mai");
    const me = await call("/api/me", { cookie: s.cookie });
    expect(me.json.user).toMatchObject({ email: s.email, name: "Mai", emailVerified: true });
    expect(me.json.memberships).toMatchObject([{ tenantId: t.tenantId, role: "student" }]);
    const row = await env.DB.prepare("SELECT status, user_id FROM students WHERE tenant_id = ? AND email = ?")
      .bind(t.tenantId, s.email)
      .first<{ status: string; user_id: string }>();
    expect(row).toEqual({ status: "active", user_id: s.userId });
    const user = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(s.userId)
      .first<{ password_hash: string | null }>();
    expect(user?.password_hash).toBeNull();
  });

  it("works only once", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    await invite(t.cookie, email);
    const token = await latestToken(email, "invite");
    expect((await call("/api/invites/accept", { method: "POST", body: { token } })).status).toBe(200);
    expect((await call("/api/invites/accept", { method: "POST", body: { token } })).status).toBe(410);
  });

  it("keeps a student signed in for 1 day, or 30 days on their own device", async () => {
    const t = await createTeacher();
    const idleDays = async (trust: boolean) => {
      const email = uniqueEmail("kid");
      await invite(t.cookie, email);
      const res = await call("/api/invites/accept", {
        method: "POST",
        body: { token: await latestToken(email, "invite"), trustDevice: trust },
      });
      const me = await call("/api/me", { cookie: res.cookie });
      const row = await env.DB.prepare("SELECT idle_days FROM sessions WHERE user_id = ?")
        .bind(me.json.user.id)
        .first<{ idle_days: number }>();
      return row?.idle_days;
    };
    expect(await idleDays(false)).toBe(1);
    expect(await idleDays(true)).toBe(30);
  });

  it("lets a student sign in later with a magic link", async () => {
    const t = await createTeacher();
    const s = await createStudent(t);
    await call("/api/auth/sign-in-link/request", { method: "POST", body: { email: s.email } });
    const res = await call("/api/auth/sign-in-link/consume", {
      method: "POST",
      body: { token: await latestToken(s.email, "magic_link") },
    });
    expect(res.status).toBe(200);
    expect((await call("/api/me", { cookie: res.cookie })).json.memberships[0].role).toBe("student");
  });

  it("adds a second tenant to a person who already has an account", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    // Teacher A is invited by teacher B as a student.
    const token = async () => {
      await invite(b.cookie, a.email);
      return latestToken(a.email, "invite");
    };
    const res = await call("/api/invites/accept", { method: "POST", body: { token: await token() } });
    expect(res.status).toBe(200);
    const me = await call("/api/me", { cookie: res.cookie });
    expect(me.json.memberships.map((m: { role: string }) => m.role).sort()).toEqual(["student", "teacher"]);
    expect(me.json.memberships.map((m: { tenantId: string }) => m.tenantId).sort()).toEqual(
      [a.tenantId, b.tenantId].sort(),
    );
  });

  it("is refused when the teacher's tenant is paused", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    await invite(t.cookie, email);
    await env.DB.prepare("UPDATE tenants SET status = 'suspended' WHERE id = ?").bind(t.tenantId).run();
    const res = await call("/api/invites/accept", {
      method: "POST",
      body: { token: await latestToken(email, "invite") },
    });
    expect(res.json.error.code).toBe("ACCOUNT_PAUSED");
  });
});

describe("resend and cancel", () => {
  it("a resent invite makes the old link stop working", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    await invite(t.cookie, email);
    const first = await latestToken(email, "invite");
    const list = await call("/api/invites", { cookie: t.cookie });
    const studentId = list.json.invites[0].studentId;
    expect(
      (await call(`/api/invites/${studentId}/resend`, { method: "POST", cookie: t.cookie })).status,
    ).toBe(202);
    const second = await latestToken(email, "invite");
    expect(second).not.toBe(first);
    expect((await call("/api/invites/accept", { method: "POST", body: { token: first } })).status).toBe(410);
    expect((await call("/api/invites/accept", { method: "POST", body: { token: second } })).status).toBe(200);
  });

  it("a cancelled invite cannot be used and shows as cancelled", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    await invite(t.cookie, email);
    const token = await latestToken(email, "invite");
    const studentId = (await call("/api/invites", { cookie: t.cookie })).json.invites[0].studentId;
    expect((await call(`/api/invites/${studentId}`, { method: "DELETE", cookie: t.cookie })).status).toBe(
      200,
    );
    expect((await call("/api/invites/accept", { method: "POST", body: { token } })).status).toBe(410);
    expect((await call("/api/invites", { cookie: t.cookie })).json.invites[0].state).toBe("revoked");
  });

  it("an old invite shows as expired", async () => {
    const t = await createTeacher();
    const email = uniqueEmail("kid");
    await invite(t.cookie, email);
    await env.DB.prepare("UPDATE auth_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE email = ?")
      .bind(email)
      .run();
    expect((await call("/api/invites", { cookie: t.cookie })).json.invites[0].state).toBe("expired");
  });
});

describe("one teacher can never reach another teacher's students", () => {
  it("cannot resend or cancel them, and does not see them in the list", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    const email = uniqueEmail("kid");
    await invite(a.cookie, email);
    const studentId = (await call("/api/invites", { cookie: a.cookie })).json.invites[0].studentId;

    expect(
      (await call(`/api/invites/${studentId}/resend`, { method: "POST", cookie: b.cookie })).status,
    ).toBe(404);
    expect((await call(`/api/invites/${studentId}`, { method: "DELETE", cookie: b.cookie })).status).toBe(
      404,
    );
    expect((await call("/api/invites", { cookie: b.cookie })).json.invites).toEqual([]);
    // and the student is still invited
    expect((await call("/api/invites", { cookie: a.cookie })).json.invites[0].state).toBe("sent");
  });

  it("the same email can be a student of two teachers", async () => {
    const a = await createTeacher("Teacher A");
    const b = await createTeacher("Teacher B");
    const email = uniqueEmail("kid");
    expect((await invite(a.cookie, email)).status).toBe(202);
    expect((await invite(b.cookie, email)).status).toBe(202);
    expect((await call("/api/invites", { cookie: a.cookie })).json.invites.length).toBe(1);
    expect((await call("/api/invites", { cookie: b.cookie })).json.invites.length).toBe(1);
  });
});
