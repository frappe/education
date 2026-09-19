import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  call,
  createTeacher,
  emailsTo,
  latestToken,
  randomIp,
  signInWithLink,
  turnstileAnswer,
  uniqueEmail,
} from "./helpers";

const signUp = (email: string, extra: Record<string, unknown> = {}) =>
  call("/api/auth/sign-up", { method: "POST", body: { name: "Anna", email, ...extra } });
const requestLink = (email: string, ip?: string) =>
  call("/api/auth/sign-in-link/request", { method: "POST", ip, body: { email } });
const kinds = async (email: string) => (await emailsTo(email)).map((e) => e.kind);

describe("sign up", () => {
  it("creates an unconfirmed teacher with their own tenant and sends one confirm email", async () => {
    const email = uniqueEmail();
    const res = await signUp(email);
    expect(res.status).toBe(202);
    const user = await env.DB.prepare(
      "SELECT id, email_verified_at, password_hash FROM users WHERE email = ?",
    )
      .bind(email)
      .first<{ id: string; email_verified_at: string | null; password_hash: string | null }>();
    expect(user?.email_verified_at).toBeNull();
    expect(user?.password_hash).toBeNull();
    const m = await env.DB.prepare("SELECT role FROM memberships WHERE user_id = ?")
      .bind(user!.id)
      .all<{ role: string }>();
    expect(m.results).toEqual([{ role: "teacher" }]);
    expect(await kinds(email)).toEqual(["verify_email"]);
  });

  it("gives the same answer for a new and an already used email (no account guessing)", async () => {
    const t = await createTeacher();
    const fresh = uniqueEmail();
    const a = await signUp(fresh);
    const b = await signUp(t.email);
    expect(b.status).toBe(a.status);
    expect(b.json).toEqual(a.json);
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?")
      .bind(t.email)
      .first<{ n: number }>();
    expect(count?.n).toBe(1);
  });

  it("sends a sign in link to someone who signs up again, and a new confirm link if still unconfirmed", async () => {
    const t = await createTeacher();
    await signUp(t.email);
    expect((await kinds(t.email)).at(-1)).toBe("magic_link");

    const email = uniqueEmail();
    await signUp(email);
    const first = await latestToken(email, "verify_email");
    await signUp(email);
    const second = await latestToken(email, "verify_email");
    expect(second).not.toBe(first);
    expect((await call("/api/auth/verify-email", { method: "POST", body: { token: first } })).status).toBe(
      410,
    );
    expect((await call("/api/auth/verify-email", { method: "POST", body: { token: second } })).status).toBe(
      200,
    );
  });

  it("treats emails as case-insensitive and trims spaces", async () => {
    const email = uniqueEmail();
    await signUp(email);
    await signUp(`  ${email.toUpperCase()} `);
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?")
      .bind(email)
      .first<{ n: number }>();
    expect(count?.n).toBe(1);
  });

  it("refuses a missing name and a bad email with field errors, and malformed JSON", async () => {
    const noName = await call("/api/auth/sign-up", {
      method: "POST",
      body: { name: "  ", email: uniqueEmail() },
    });
    expect(noName.status).toBe(400);
    expect(noName.json.error.fields.name).toBeDefined();
    const bad = await signUp("not-an-email");
    expect(bad.json.error.fields.email).toBeDefined();
    const broken = await call("/api/auth/sign-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    expect(broken.json.error.code).toBe("VALIDATION_FAILED");
  });

  it("ignores a password sent by an old client (nothing is stored)", async () => {
    const email = uniqueEmail();
    expect((await signUp(email, { password: "whatever-123456" })).status).toBe(202);
    const row = await env.DB.prepare("SELECT password_hash FROM users WHERE email = ?")
      .bind(email)
      .first<{ password_hash: string | null }>();
    expect(row?.password_hash).toBeNull();
  });

  it("limits sign ups from one address", async () => {
    const ip = randomIp();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push(
        (await call("/api/auth/sign-up", { method: "POST", ip, body: { name: "A", email: uniqueEmail() } }))
          .status,
      );
    }
    expect(statuses.filter((s) => s === 429).length).toBe(2);
  });
});

describe("confirm email", () => {
  it("signs the person in and works only once", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const token = await latestToken(email, "verify_email");
    const ok = await call("/api/auth/verify-email", { method: "POST", body: { token } });
    expect(ok.status).toBe(200);
    const me = await call("/api/me", { cookie: ok.cookie });
    expect(me.json.user).toMatchObject({ email, emailVerified: true });
    const again = await call("/api/auth/verify-email", { method: "POST", body: { token } });
    expect(again.status).toBe(410);
    expect(again.json.error.code).toBe("LINK_EXPIRED");
  });

  it("refuses a wrong or expired token", async () => {
    expect(
      (await call("/api/auth/verify-email", { method: "POST", body: { token: "x".repeat(43) } })).status,
    ).toBe(410);
    const email = uniqueEmail();
    await signUp(email);
    const token = await latestToken(email, "verify_email");
    await env.DB.prepare("UPDATE auth_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE email = ?")
      .bind(email)
      .run();
    expect((await call("/api/auth/verify-email", { method: "POST", body: { token } })).status).toBe(410);
  });

  it("lets only one of several simultaneous clicks win", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const token = await latestToken(email, "verify_email");
    const results = await Promise.all(
      [1, 2, 3].map(() => call("/api/auth/verify-email", { method: "POST", body: { token } })),
    );
    expect(results.filter((r) => r.status === 200).length).toBe(1);
  });
});

describe("sign in with an email link", () => {
  it("gives the same answer for known and unknown emails, and mails only known ones", async () => {
    const t = await createTeacher();
    const unknown = uniqueEmail();
    const a = await requestLink(t.email);
    const b = await requestLink(unknown);
    expect(a.status).toBe(202);
    expect(b.status).toBe(a.status);
    expect(b.json).toEqual(a.json);
    expect((await kinds(t.email)).includes("magic_link")).toBe(true);
    expect(await emailsTo(unknown)).toEqual([]);
  });

  it("signs a person in once, with a safe cookie", async () => {
    const t = await createTeacher();
    await requestLink(t.email);
    const token = await latestToken(t.email, "magic_link");
    const ok = await call("/api/auth/sign-in-link/consume", { method: "POST", body: { token } });
    expect(ok.status).toBe(200);
    expect(ok.setCookie).toMatch(/HttpOnly/i);
    expect(ok.setCookie).toMatch(/SameSite=Lax/i);
    expect(ok.setCookie).toMatch(/Path=\//);
    expect((await call("/api/me", { cookie: ok.cookie })).json.memberships[0].role).toBe("teacher");
    expect((await call("/api/auth/sign-in-link/consume", { method: "POST", body: { token } })).status).toBe(
      410,
    );
  });

  it("lets only one of several simultaneous clicks win", async () => {
    const t = await createTeacher();
    await requestLink(t.email);
    const token = await latestToken(t.email, "magic_link");
    const results = await Promise.all(
      [1, 2, 3].map(() => call("/api/auth/sign-in-link/consume", { method: "POST", body: { token } })),
    );
    expect(results.filter((r) => r.status === 200).length).toBe(1);
  });

  it("expires after 15 minutes", async () => {
    const t = await createTeacher();
    await requestLink(t.email);
    const token = await latestToken(t.email, "magic_link");
    await env.DB.prepare(
      "UPDATE auth_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE email = ? AND kind = 'magic_link'",
    )
      .bind(t.email)
      .run();
    expect((await call("/api/auth/sign-in-link/consume", { method: "POST", body: { token } })).status).toBe(
      410,
    );
  });

  it("a newer link replaces the older one", async () => {
    const t = await createTeacher();
    await requestLink(t.email);
    const first = await latestToken(t.email, "magic_link");
    await requestLink(t.email);
    const second = await latestToken(t.email, "magic_link");
    expect(second).not.toBe(first);
    expect(
      (await call("/api/auth/sign-in-link/consume", { method: "POST", body: { token: first } })).status,
    ).toBe(410);
    expect(
      (await call("/api/auth/sign-in-link/consume", { method: "POST", body: { token: second } })).status,
    ).toBe(200);
  });

  it("sends the confirm link, not a sign in link, to someone who has not confirmed yet", async () => {
    const email = uniqueEmail();
    await signUp(email);
    await requestLink(email);
    expect(await kinds(email)).toEqual(["verify_email", "verify_email"]);
  });

  it("gives a new session token every time (no session fixation), and stores only a hash", async () => {
    const t = await createTeacher();
    const a = await signInWithLink(t.email);
    const b = await signInWithLink(t.email);
    expect(new Set([a, b, t.cookie]).size).toBe(3);
    const token = a.split("=")[1]!;
    const rows = await env.DB.prepare("SELECT token_hash FROM sessions WHERE user_id = ?")
      .bind(t.userId)
      .all<{ token_hash: string }>();
    for (const r of rows.results) expect(r.token_hash).not.toContain(token);
  });

  it("uses the __Host- cookie with Secure outside local and test", async () => {
    const t = await createTeacher();
    const config = {
      ENVIRONMENT: "staging",
      HMAC_KEY: "k",
      TURNSTILE_SECRET: "s",
      APP_URL: "https://x.workers.dev",
    } as const;
    await call("/api/auth/sign-in-link/request", {
      method: "POST",
      env: config,
      body: { email: t.email, captcha: "ok" },
    });
    const token = await latestToken(t.email, "magic_link");
    const res = await call("/api/auth/sign-in-link/consume", {
      method: "POST",
      env: config,
      body: { token },
    });
    expect(res.status).toBe(200);
    expect(res.setCookie).toMatch(/^__Host-sid=/);
    expect(res.setCookie).toMatch(/Secure/);
    expect(res.setCookie).not.toMatch(/Domain=/i);
  });

  it("limits how many links one address can ask for (5 an hour) and how many one connection can ask for", async () => {
    const t = await createTeacher();
    for (let i = 0; i < 8; i++) await requestLink(t.email);
    expect((await emailsTo(t.email)).filter((e) => e.kind === "magic_link").length).toBeLessThanOrEqual(5);

    const ip = randomIp();
    for (let i = 0; i < 12; i++) await requestLink(uniqueEmail(), ip);
    const extra = await createTeacher();
    await requestLink(extra.email, ip); // this connection asked too many times: still the same quiet answer
    expect((await emailsTo(extra.email)).filter((e) => e.kind === "magic_link").length).toBe(0);
  });

  it("refuses a disabled account, and a teacher whose tenant is paused", async () => {
    const t = await createTeacher();
    await requestLink(t.email);
    const token = await latestToken(t.email, "magic_link");
    await env.DB.prepare("UPDATE users SET disabled_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), t.userId)
      .run();
    expect(
      (await call("/api/auth/sign-in-link/consume", { method: "POST", body: { token } })).json.error.code,
    ).toBe("ACCOUNT_PAUSED");
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401); // an open session stops at once

    const u = await createTeacher();
    await requestLink(u.email);
    const token2 = await latestToken(u.email, "magic_link");
    await env.DB.prepare("UPDATE tenants SET status = 'suspended' WHERE id = ?").bind(u.tenantId).run();
    expect(
      (await call("/api/auth/sign-in-link/consume", { method: "POST", body: { token: token2 } })).json.error
        .code,
    ).toBe("ACCOUNT_PAUSED");
  });

  it("does not send a link to a disabled account", async () => {
    const t = await createTeacher();
    await env.DB.prepare("UPDATE users SET disabled_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), t.userId)
      .run();
    const before = (await kinds(t.email)).length;
    await requestLink(t.email);
    expect((await kinds(t.email)).length).toBe(before);
  });

  it("has no password sign in any more", async () => {
    const t = await createTeacher();
    for (const path of [
      "/api/auth/sign-in",
      "/api/auth/password/forgot",
      "/api/auth/password/reset",
      "/api/auth/password/change",
    ]) {
      expect(
        (await call(path, { method: "POST", cookie: t.cookie, body: { email: t.email, password: "x" } }))
          .status,
      ).toBe(404);
    }
  });
});

describe("emails are sent after the answer", () => {
  it("hands the sending to waitUntil, so the time it takes cannot show who has an account", async () => {
    const t = await createTeacher();
    const before = (await emailsTo(t.email)).length;
    const pending: Promise<unknown>[] = [];
    const known = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      waitUntil: pending,
      body: { email: t.email },
    });
    expect(known.status).toBe(202);
    expect(pending.length).toBe(1);
    await Promise.all(pending);
    expect((await emailsTo(t.email)).length).toBe(before + 1);

    const nothing: Promise<unknown>[] = [];
    await call("/api/auth/sign-in-link/request", {
      method: "POST",
      waitUntil: nothing,
      body: { email: uniqueEmail() },
    });
    expect(nothing.length).toBe(0);
  });

  it("a failing email service does not turn into an error for the person", async () => {
    const t = await createTeacher();
    const pending: Promise<unknown>[] = [];
    const res = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      waitUntil: pending,
      env: { EMAIL_MODE: "cloudflare" }, // not available yet: sending will fail
      body: { email: t.email },
    });
    expect(res.status).toBe(202);
    await expect(Promise.all(pending)).resolves.toBeDefined(); // the failure is logged, not thrown
  });
});

describe("bot check (Turnstile)", () => {
  const strict = { TURNSTILE_SECRET: "test-secret" };

  it("is required when a secret is set, on sign up and on asking for a link", async () => {
    const link = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      env: strict,
      body: { email: uniqueEmail() },
    });
    expect(link.json.error.code).toBe("CAPTCHA_FAILED");
    const up = await call("/api/auth/sign-up", {
      method: "POST",
      env: strict,
      body: { name: "A", email: uniqueEmail() },
    });
    expect(up.json.error.code).toBe("CAPTCHA_FAILED");
  });

  it("passes when the answer is good and fails when it is not", async () => {
    turnstileAnswer.success = true;
    const good = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      env: strict,
      body: { email: uniqueEmail(), captcha: "tok" },
    });
    expect(good.status).toBe(202);
    turnstileAnswer.success = false;
    const bad = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      env: strict,
      body: { email: uniqueEmail(), captcha: "tok" },
    });
    expect(bad.json.error.code).toBe("CAPTCHA_FAILED");
    turnstileAnswer.success = true;
  });

  it("cannot be switched off by leaving the secret out in staging or production", async () => {
    const res = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      env: {
        ENVIRONMENT: "production",
        HMAC_KEY: "k",
        APP_URL: "https://x.workers.dev",
        EMAIL_MODE: "cloudflare",
      },
      body: { email: uniqueEmail() },
    });
    expect(res.status).toBe(500);
  });
});

describe("safe defaults", () => {
  it("dev email mode is refused in production (nothing is stored or sent)", async () => {
    const email = uniqueEmail();
    const res = await call("/api/auth/sign-up", {
      method: "POST",
      env: {
        ENVIRONMENT: "production",
        EMAIL_MODE: "dev",
        HMAC_KEY: "k",
        TURNSTILE_SECRET: "s",
        APP_URL: "https://x.workers.dev",
      },
      body: { name: "A", email, captcha: "ok" },
    });
    expect(res.status).toBe(202); // same answer as always
    expect(await emailsTo(email)).toEqual([]); // but no email was written
  });

  it("does not show the dev outbox outside local and test", async () => {
    expect((await call("/api/dev/outbox", { env: { ENVIRONMENT: "staging" } })).status).toBe(404);
  });

  it("builds email links from APP_URL, not from the Host header", async () => {
    const email = uniqueEmail();
    await call("/api/auth/sign-up", {
      method: "POST",
      headers: { host: "evil.example", "x-forwarded-host": "evil.example" },
      body: { name: "A", email },
    });
    const mail = (await emailsTo(email))[0]!;
    expect(mail.body_text).toContain("https://lms.test/verify-email?token=");
    expect(mail.body_text).not.toContain("evil.example");
  });
});

describe("sessions", () => {
  it("rejects no cookie and a made-up cookie", async () => {
    expect((await call("/api/me")).status).toBe(401);
    expect((await call("/api/me", { cookie: "sid=not-a-real-token" })).status).toBe(401);
  });

  it("ends when the person signs out", async () => {
    const t = await createTeacher();
    const out = await call("/api/auth/sign-out", { method: "POST", cookie: t.cookie });
    expect(out.status).toBe(200);
    expect(out.setCookie).toMatch(/sid=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401);
  });

  it("ends after being idle too long (teachers: 7 days)", async () => {
    const t = await createTeacher();
    const old = new Date(Date.now() - 8 * 86_400_000).toISOString();
    await env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE user_id = ?").bind(old, t.userId).run();
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401);
  });

  it("ends after the 30 day maximum", async () => {
    const t = await createTeacher();
    await env.DB.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE user_id = ?")
      .bind(t.userId)
      .run();
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401);
  });

  it("lists devices, marks the current one, and can end another one", async () => {
    const t = await createTeacher();
    const second = await signInWithLink(t.email);
    const list = await call("/api/auth/sessions", { cookie: t.cookie });
    expect(list.json.sessions.length).toBe(2);
    expect(list.json.sessions.filter((s: { current: boolean }) => s.current).length).toBe(1);
    const other = list.json.sessions.find((s: { current: boolean }) => !s.current);
    expect(
      (await call(`/api/auth/sessions/${other.id}`, { method: "DELETE", cookie: t.cookie })).status,
    ).toBe(200);
    expect((await call("/api/me", { cookie: second })).status).toBe(401);
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(200);
  });

  it("cannot end another person's session", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const listB = await call("/api/auth/sessions", { cookie: b.cookie });
    expect(
      (await call(`/api/auth/sessions/${listB.json.sessions[0].id}`, { method: "DELETE", cookie: a.cookie }))
        .status,
    ).toBe(404);
    expect((await call("/api/me", { cookie: b.cookie })).status).toBe(200);
  });

  it("can end every session at once", async () => {
    const t = await createTeacher();
    const second = await signInWithLink(t.email);
    await call("/api/auth/sign-out-everywhere", { method: "POST", cookie: t.cookie });
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401);
    expect((await call("/api/me", { cookie: second })).status).toBe(401);
  });
});

describe("CSRF and audit", () => {
  it("refuses a request from a page on another site", async () => {
    const res = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      noClientHeader: true,
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      body: { email: "a@example.com" },
    });
    expect(res.status).toBe(403);
  });

  it("writes an audit row for sign up, confirm and sign in, without secrets or the full email", async () => {
    const t = await createTeacher();
    await signInWithLink(t.email);
    const rows = await env.DB.prepare("SELECT action, meta FROM audit_log WHERE actor_user_id = ?")
      .bind(t.userId)
      .all<{ action: string; meta: string | null }>();
    const actions = rows.results.map((r) => r.action);
    expect(actions).toEqual(
      expect.arrayContaining(["auth.sign_up", "auth.email_verified", "auth.sign_in_link"]),
    );
    expect(JSON.stringify(rows.results)).not.toContain(t.email);
  });

  it("cannot be changed or deleted", async () => {
    await createTeacher();
    await expect(env.DB.prepare("UPDATE audit_log SET action = 'x'").run()).rejects.toThrow(/append only/);
    await expect(env.DB.prepare("DELETE FROM audit_log").run()).rejects.toThrow(/append only/);
  });

  it("keeps counters by keyed hash, never by raw email or IP address", async () => {
    const email = uniqueEmail();
    const ip = "203.0.113.77";
    await requestLink(email, ip);
    const keys = await env.DB.prepare("SELECT key FROM rate_limits").all<{ key: string }>();
    for (const k of keys.results) {
      expect(k.key).not.toContain(email);
      expect(k.key).not.toContain(ip);
    }
  });
});
