import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  GOOD_PASSWORD,
  call,
  createTeacher,
  emailsTo,
  latestToken,
  pwnedPasswords,
  randomIp,
  turnstileAnswer,
  uniqueEmail,
} from "./helpers";

const signUp = (email: string, extra: Record<string, unknown> = {}) =>
  call("/api/auth/sign-up", {
    method: "POST",
    body: { name: "Anna", email, password: GOOD_PASSWORD, ...extra },
  });

describe("sign up", () => {
  it("creates an unconfirmed teacher with their own tenant and sends a confirm email", async () => {
    const email = uniqueEmail();
    const res = await signUp(email);
    expect(res.status).toBe(202);
    const user = await env.DB.prepare(
      "SELECT id, email_verified_at, password_hash FROM users WHERE email = ?",
    )
      .bind(email)
      .first<{ id: string; email_verified_at: string | null; password_hash: string }>();
    expect(user?.email_verified_at).toBeNull();
    expect(user?.password_hash).toMatch(/^\$argon2id\$/);
    const m = await env.DB.prepare("SELECT role FROM memberships WHERE user_id = ?")
      .bind(user!.id)
      .all<{ role: string }>();
    expect(m.results).toEqual([{ role: "teacher" }]);
    expect((await emailsTo(email)).map((e) => e.kind)).toEqual(["verify_email"]);
  });

  it("gives the same answer for a new and an already used email (no account guessing)", async () => {
    const email = uniqueEmail();
    const first = await signUp(email);
    const second = await signUp(email);
    expect(second.status).toBe(first.status);
    expect(second.json).toEqual(first.json);
    expect((await emailsTo(email)).map((e) => e.kind)).toEqual(["verify_email", "account_exists"]);
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?")
      .bind(email)
      .first<{ n: number }>();
    expect(count?.n).toBe(1);
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

  it("refuses short passwords, very long passwords and bad emails with field errors", async () => {
    const short = await signUp(uniqueEmail(), { password: "short" });
    expect(short.status).toBe(400);
    expect(short.json.error.fields.password).toMatch(/at least 10/);
    const long = await signUp(uniqueEmail(), { password: "x".repeat(129) });
    expect(long.status).toBe(400);
    const badEmail = await signUp("not-an-email");
    expect(badEmail.status).toBe(400);
    expect(badEmail.json.error.fields.email).toBeDefined();
  });

  it("refuses a password found in a data leak", async () => {
    pwnedPasswords.add("Password123456");
    const res = await signUp(uniqueEmail(), { password: "Password123456" });
    expect(res.status).toBe(400);
    expect(res.json.error.fields.password).toMatch(/data leak/);
  });

  it("refuses malformed JSON", async () => {
    const res = await call("/api/auth/sign-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("VALIDATION_FAILED");
  });

  it("limits sign ups from one address", async () => {
    const ip = randomIp();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push(
        (
          await call("/api/auth/sign-up", {
            method: "POST",
            ip,
            body: { name: "A", email: uniqueEmail(), password: GOOD_PASSWORD },
          })
        ).status,
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
    expect(ok.cookie).toBeDefined();
    const me = await call("/api/me", { cookie: ok.cookie });
    expect(me.json.user).toMatchObject({ email, emailVerified: true });
    const again = await call("/api/auth/verify-email", { method: "POST", body: { token } });
    expect(again.status).toBe(410);
    expect(again.json.error.code).toBe("LINK_EXPIRED");
  });

  it("refuses a wrong or expired token", async () => {
    const wrong = await call("/api/auth/verify-email", { method: "POST", body: { token: "x".repeat(43) } });
    expect(wrong.status).toBe(410);

    const email = uniqueEmail();
    await signUp(email);
    const token = await latestToken(email, "verify_email");
    await env.DB.prepare("UPDATE auth_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE email = ?")
      .bind(email)
      .run();
    const expired = await call("/api/auth/verify-email", { method: "POST", body: { token } });
    expect(expired.status).toBe(410);
  });

  it("lets only one of two simultaneous clicks win", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const token = await latestToken(email, "verify_email");
    const results = await Promise.all(
      [1, 2, 3].map(() => call("/api/auth/verify-email", { method: "POST", body: { token } })),
    );
    expect(results.filter((r) => r.status === 200).length).toBe(1);
  });
});

describe("send the confirm email again", () => {
  it("sends a new link to someone who has not confirmed, and the old link stops working", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const first = await latestToken(email, "verify_email");
    const res = await call("/api/auth/verify-email/resend", { method: "POST", body: { email } });
    expect(res.status).toBe(202);
    const second = await latestToken(email, "verify_email");
    expect(second).not.toBe(first);
    expect((await call("/api/auth/verify-email", { method: "POST", body: { token: first } })).status).toBe(
      410,
    );
    expect((await call("/api/auth/verify-email", { method: "POST", body: { token: second } })).status).toBe(
      200,
    );
  });

  it("says the same for confirmed, unknown and unconfirmed emails, and mails only the last", async () => {
    const t = await createTeacher();
    const unknown = uniqueEmail();
    const a = await call("/api/auth/verify-email/resend", { method: "POST", body: { email: t.email } });
    const b = await call("/api/auth/verify-email/resend", { method: "POST", body: { email: unknown } });
    expect(a.json).toEqual(b.json);
    expect(a.status).toBe(b.status);
    expect((await emailsTo(t.email)).filter((e) => e.kind === "verify_email").length).toBe(1);
    expect(await emailsTo(unknown)).toEqual([]);
  });
});

describe("sign in", () => {
  it("works with the right password and sets a safe cookie", async () => {
    const t = await createTeacher();
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    expect(res.status).toBe(200);
    expect(res.setCookie).toMatch(/HttpOnly/i);
    expect(res.setCookie).toMatch(/SameSite=Lax/i);
    expect(res.setCookie).toMatch(/Path=\//);
    const me = await call("/api/me", { cookie: res.cookie });
    expect(me.status).toBe(200);
    expect(me.json.memberships[0].role).toBe("teacher");
  });

  it("uses the __Host- cookie with Secure outside local and test", async () => {
    const t = await createTeacher();
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password, captcha: "ok" },
      env: { ENVIRONMENT: "staging", HMAC_KEY: "k", TURNSTILE_SECRET: "s", APP_URL: "https://x.workers.dev" },
    });
    expect(res.status).toBe(200);
    expect(res.setCookie).toMatch(/^__Host-sid=/);
    expect(res.setCookie).toMatch(/Secure/);
    expect(res.setCookie).not.toMatch(/Domain=/i);
  });

  it("stores only a hash of the session token", async () => {
    const t = await createTeacher();
    const token = t.cookie.split("=")[1]!;
    const rows = await env.DB.prepare("SELECT token_hash FROM sessions WHERE user_id = ?")
      .bind(t.userId)
      .all<{ token_hash: string }>();
    expect(rows.results.length).toBeGreaterThan(0);
    for (const r of rows.results) expect(r.token_hash).not.toContain(token);
  });

  it("gives a new session token every time (no session fixation)", async () => {
    const t = await createTeacher();
    const a = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    const b = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    expect(a.cookie).not.toBe(b.cookie);
    expect(a.cookie).not.toBe(t.cookie);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const t = await createTeacher();
    const wrong = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: "wrong-password-1" },
    });
    const unknown = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: uniqueEmail(), password: "wrong-password-1" },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.json.error.code).toBe(unknown.json.error.code);
    expect(wrong.json.error.message).toBe(unknown.json.error.message);
  });

  it("does the slow password work for an unknown email too, so timing shows nothing", async () => {
    const time = async () => {
      const t0 = performance.now();
      await call("/api/auth/sign-in", {
        method: "POST",
        body: { email: uniqueEmail(), password: "wrong-password-1" },
      });
      return performance.now() - t0;
    };
    // A full Argon2id hash takes about 100 ms or more. Returning early would take a few ms.
    // The fastest of three tries is used, so a busy machine cannot make this test fail by chance.
    const fastest = Math.min(await time(), await time(), await time());
    expect(fastest).toBeGreaterThan(40);
  });

  it("does not sign in before the email is confirmed, but only says so after the right password", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const right = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email, password: GOOD_PASSWORD },
    });
    expect(right.status).toBe(403);
    expect(right.json.error.code).toBe("EMAIL_NOT_VERIFIED");
    const wrong = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email, password: "wrong-password-1" },
    });
    expect(wrong.json.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("locks after 5 wrong tries, even for the right password, and does not lock other places", async () => {
    const t = await createTeacher();
    const ip = randomIp();
    for (let i = 0; i < 5; i++) {
      const r = await call("/api/auth/sign-in", {
        method: "POST",
        ip,
        body: { email: t.email, password: "wrong-password-1" },
      });
      expect(r.status).toBe(401);
    }
    const locked = await call("/api/auth/sign-in", {
      method: "POST",
      ip,
      body: { email: t.email, password: t.password },
    });
    expect(locked.status).toBe(429);
    expect(locked.json.error.code).toBe("ACCOUNT_LOCKED");
    // The real owner on another connection is not locked out by a stranger's guesses.
    const other = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    expect(other.status).toBe(200);
  });

  it("locks unknown emails the same way, so the lock never shows if an account exists", async () => {
    const email = uniqueEmail();
    const ip = randomIp();
    for (let i = 0; i < 5; i++)
      await call("/api/auth/sign-in", { method: "POST", ip, body: { email, password: "wrong-password-1" } });
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      ip,
      body: { email, password: "wrong-password-1" },
    });
    expect(res.json.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("does not count the lock counters by raw email or IP", async () => {
    const email = uniqueEmail();
    const ip = "203.0.113.77";
    await call("/api/auth/sign-in", { method: "POST", ip, body: { email, password: "wrong-password-1" } });
    const keys = await env.DB.prepare("SELECT key FROM rate_limits").all<{ key: string }>();
    for (const k of keys.results) {
      expect(k.key).not.toContain(email);
      expect(k.key).not.toContain(ip);
    }
  });

  it("clears the wrong-try counter after a good sign in", async () => {
    const t = await createTeacher();
    const ip = randomIp();
    for (let i = 0; i < 4; i++)
      await call("/api/auth/sign-in", {
        method: "POST",
        ip,
        body: { email: t.email, password: "wrong-password-1" },
      });
    expect(
      (
        await call("/api/auth/sign-in", {
          method: "POST",
          ip,
          body: { email: t.email, password: t.password },
        })
      ).status,
    ).toBe(200);
    for (let i = 0; i < 4; i++) {
      expect(
        (
          await call("/api/auth/sign-in", {
            method: "POST",
            ip,
            body: { email: t.email, password: "wrong-password-1" },
          })
        ).status,
      ).toBe(401);
    }
  });

  it("upgrades an old, weaker password hash at sign in", async () => {
    const t = await createTeacher();
    const weak =
      "$argon2id$v=19$m=4096,t=1,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    // Replace with a real weak hash of the same password.
    const { argon2idAsync } = await import("@noble/hashes/argon2.js");
    const salt = new Uint8Array(16).fill(7);
    const raw = await argon2idAsync(t.password, salt, { m: 4096, t: 1, p: 1, dkLen: 32 });
    const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/=+$/, "");
    const stored = `$argon2id$v=19$m=4096,t=1,p=1$${b64(salt)}$${b64(raw)}`;
    expect(stored).not.toBe(weak);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(stored, t.userId).run();
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    expect(res.status).toBe(200);
    const row = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(t.userId)
      .first<{ password_hash: string }>();
    expect(row?.password_hash).toContain("m=19456,t=2,p=1");
  });

  it("refuses a disabled account", async () => {
    const t = await createTeacher();
    await env.DB.prepare("UPDATE users SET disabled_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), t.userId)
      .run();
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    expect(res.json.error.code).toBe("ACCOUNT_PAUSED");
    // and an existing session stops working at once
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401);
  });

  it("refuses a teacher whose tenant is paused", async () => {
    const t = await createTeacher();
    await env.DB.prepare("UPDATE tenants SET status = 'suspended' WHERE id = ?").bind(t.tenantId).run();
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    expect(res.json.error.code).toBe("ACCOUNT_PAUSED");
  });
});

describe("bot check (Turnstile)", () => {
  const strict = { TURNSTILE_SECRET: "test-secret" };

  it("is required when a secret is set", async () => {
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      env: strict,
      body: { email: uniqueEmail(), password: "x" },
    });
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("CAPTCHA_FAILED");
  });

  it("passes when the answer is good and fails when it is not", async () => {
    turnstileAnswer.success = true;
    const good = await call("/api/auth/sign-in", {
      method: "POST",
      env: strict,
      body: { email: uniqueEmail(), password: "x", captcha: "tok" },
    });
    expect(good.json.error.code).toBe("INVALID_CREDENTIALS"); // got past the bot check
    turnstileAnswer.success = false;
    const bad = await call("/api/auth/sign-in", {
      method: "POST",
      env: strict,
      body: { email: uniqueEmail(), password: "x", captcha: "tok" },
    });
    expect(bad.json.error.code).toBe("CAPTCHA_FAILED");
    turnstileAnswer.success = true;
  });

  it("cannot be switched off by leaving the secret out in staging or production", async () => {
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      env: {
        ENVIRONMENT: "production",
        HMAC_KEY: "k",
        APP_URL: "https://x.workers.dev",
        EMAIL_MODE: "cloudflare",
      },
      body: { email: uniqueEmail(), password: "x" },
    });
    expect(res.status).toBe(500);
  });
});

describe("safe defaults in production", () => {
  it("refuses dev email mode", async () => {
    const res = await call("/api/auth/sign-up", {
      method: "POST",
      env: {
        ENVIRONMENT: "production",
        EMAIL_MODE: "dev",
        HMAC_KEY: "k",
        TURNSTILE_SECRET: "s",
        APP_URL: "https://x.workers.dev",
      },
      body: { name: "A", email: uniqueEmail(), password: GOOD_PASSWORD, captcha: "ok" },
    });
    expect(res.status).toBe(500);
  });

  it("does not show the dev outbox outside local and test", async () => {
    const res = await call("/api/dev/outbox", { env: { ENVIRONMENT: "staging" } });
    expect(res.status).toBe(404);
  });

  it("builds email links from APP_URL, not from the Host header", async () => {
    const email = uniqueEmail();
    await call("/api/auth/sign-up", {
      method: "POST",
      headers: { host: "evil.example", "x-forwarded-host": "evil.example" },
      body: { name: "A", email, password: GOOD_PASSWORD },
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

  it("ends after being idle too long", async () => {
    const t = await createTeacher();
    const old = new Date(Date.now() - 8 * 86_400_000).toISOString(); // teachers: 7 days idle
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
    const second = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    const list = await call("/api/auth/sessions", { cookie: t.cookie });
    expect(list.json.sessions.length).toBe(2);
    expect(list.json.sessions.filter((s: { current: boolean }) => s.current).length).toBe(1);
    const other = list.json.sessions.find((s: { current: boolean }) => !s.current);
    expect(
      (await call(`/api/auth/sessions/${other.id}`, { method: "DELETE", cookie: t.cookie })).status,
    ).toBe(200);
    expect((await call("/api/me", { cookie: second.cookie })).status).toBe(401);
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(200);
  });

  it("cannot end another person's session", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const listB = await call("/api/auth/sessions", { cookie: b.cookie });
    const res = await call(`/api/auth/sessions/${listB.json.sessions[0].id}`, {
      method: "DELETE",
      cookie: a.cookie,
    });
    expect(res.status).toBe(404);
    expect((await call("/api/me", { cookie: b.cookie })).status).toBe(200);
  });

  it("can end every session at once", async () => {
    const t = await createTeacher();
    const second = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    await call("/api/auth/sign-out-everywhere", { method: "POST", cookie: t.cookie });
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401);
    expect((await call("/api/me", { cookie: second.cookie })).status).toBe(401);
  });
});

describe("reset password", () => {
  it("says the same thing for known and unknown emails, and only mails known ones", async () => {
    const t = await createTeacher();
    const known = await call("/api/auth/password/forgot", { method: "POST", body: { email: t.email } });
    const unknownEmail = uniqueEmail();
    const unknown = await call("/api/auth/password/forgot", {
      method: "POST",
      body: { email: unknownEmail },
    });
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.json).toEqual(unknown.json);
    expect((await emailsTo(t.email)).some((e) => e.kind === "password_reset")).toBe(true);
    expect(await emailsTo(unknownEmail)).toEqual([]);
  });

  it("sets a new password, ends all sessions, and works only once", async () => {
    const t = await createTeacher();
    await call("/api/auth/password/forgot", { method: "POST", body: { email: t.email } });
    const token = await latestToken(t.email, "password_reset");
    const newPassword = "a-brand-new-password-7";
    const res = await call("/api/auth/password/reset", {
      method: "POST",
      body: { token, password: newPassword },
    });
    expect(res.status).toBe(200);
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(401);
    expect(
      (await call("/api/auth/sign-in", { method: "POST", body: { email: t.email, password: t.password } }))
        .status,
    ).toBe(401);
    expect(
      (await call("/api/auth/sign-in", { method: "POST", body: { email: t.email, password: newPassword } }))
        .status,
    ).toBe(200);
    const again = await call("/api/auth/password/reset", {
      method: "POST",
      body: { token, password: "another-password-88" },
    });
    expect(again.status).toBe(410);
  });

  it("keeps the link alive when the new password is refused", async () => {
    const t = await createTeacher();
    await call("/api/auth/password/forgot", { method: "POST", body: { email: t.email } });
    const token = await latestToken(t.email, "password_reset");
    pwnedPasswords.add("leaked-password-123");
    const weak = await call("/api/auth/password/reset", {
      method: "POST",
      body: { token, password: "leaked-password-123" },
    });
    expect(weak.status).toBe(400);
    const ok = await call("/api/auth/password/reset", {
      method: "POST",
      body: { token, password: "a-fine-new-password-5" },
    });
    expect(ok.status).toBe(200);
  });

  it("a newer reset link replaces the older one", async () => {
    const t = await createTeacher();
    await call("/api/auth/password/forgot", { method: "POST", body: { email: t.email } });
    const first = await latestToken(t.email, "password_reset");
    await call("/api/auth/password/forgot", { method: "POST", body: { email: t.email } });
    const second = await latestToken(t.email, "password_reset");
    expect(second).not.toBe(first);
    expect(
      (
        await call("/api/auth/password/reset", {
          method: "POST",
          body: { token: first, password: "a-fine-new-password-5" },
        })
      ).status,
    ).toBe(410);
    expect(
      (
        await call("/api/auth/password/reset", {
          method: "POST",
          body: { token: second, password: "a-fine-new-password-5" },
        })
      ).status,
    ).toBe(200);
  });

  it("limits reset requests for one email", async () => {
    const t = await createTeacher();
    for (let i = 0; i < 6; i++)
      await call("/api/auth/password/forgot", { method: "POST", body: { email: t.email } });
    const mails = (await emailsTo(t.email)).filter((e) => e.kind === "password_reset");
    expect(mails.length).toBe(3);
  });
});

describe("change password", () => {
  it("needs the current password", async () => {
    const t = await createTeacher();
    const res = await call("/api/auth/password/change", {
      method: "POST",
      cookie: t.cookie,
      body: { currentPassword: "wrong-password-1", newPassword: "a-fine-new-password-5" },
    });
    expect(res.status).toBe(400);
    expect(res.json.error.fields.currentPassword).toBeDefined();
  });

  it("signs out other devices but keeps this one", async () => {
    const t = await createTeacher();
    const other = await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: t.password },
    });
    const res = await call("/api/auth/password/change", {
      method: "POST",
      cookie: t.cookie,
      body: { currentPassword: t.password, newPassword: "a-fine-new-password-5" },
    });
    expect(res.status).toBe(200);
    expect((await call("/api/me", { cookie: t.cookie })).status).toBe(200);
    expect((await call("/api/me", { cookie: other.cookie })).status).toBe(401);
  });
});

describe("magic link", () => {
  it("signs a confirmed person in once, and only mails known confirmed addresses", async () => {
    const t = await createTeacher();
    const unknown = uniqueEmail();
    const a = await call("/api/auth/magic-link/request", { method: "POST", body: { email: t.email } });
    const b = await call("/api/auth/magic-link/request", { method: "POST", body: { email: unknown } });
    expect(a.status).toBe(202);
    expect(b.json).toEqual(a.json);
    expect(await emailsTo(unknown)).toEqual([]);

    const token = await latestToken(t.email, "magic_link");
    const ok = await call("/api/auth/magic-link/consume", { method: "POST", body: { token } });
    expect(ok.status).toBe(200);
    expect((await call("/api/me", { cookie: ok.cookie })).status).toBe(200);
    expect((await call("/api/auth/magic-link/consume", { method: "POST", body: { token } })).status).toBe(
      410,
    );
  });

  it("does not mail an address that has not confirmed its email", async () => {
    const email = uniqueEmail();
    await signUp(email);
    await call("/api/auth/magic-link/request", { method: "POST", body: { email } });
    expect((await emailsTo(email)).some((e) => e.kind === "magic_link")).toBe(false);
  });

  it("expires after its short life", async () => {
    const t = await createTeacher();
    await call("/api/auth/magic-link/request", { method: "POST", body: { email: t.email } });
    const token = await latestToken(t.email, "magic_link");
    await env.DB.prepare(
      "UPDATE auth_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE email = ? AND kind = 'magic_link'",
    )
      .bind(t.email)
      .run();
    expect((await call("/api/auth/magic-link/consume", { method: "POST", body: { token } })).status).toBe(
      410,
    );
  });
});

describe("CSRF and audit", () => {
  it("refuses a sign in from a page on another site", async () => {
    const res = await call("/api/auth/sign-in", {
      method: "POST",
      noClientHeader: true,
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      body: { email: "a@example.com", password: "x" },
    });
    expect(res.status).toBe(403);
  });

  it("writes an audit row for sign up, sign in and failed sign in, without secrets", async () => {
    const t = await createTeacher();
    await call("/api/auth/sign-in", {
      method: "POST",
      body: { email: t.email, password: "wrong-password-1" },
    });
    const rows = await env.DB.prepare("SELECT action, meta, ip_hash FROM audit_log WHERE actor_user_id = ?")
      .bind(t.userId)
      .all<{ action: string; meta: string | null; ip_hash: string | null }>();
    const actions = rows.results.map((r) => r.action);
    expect(actions).toContain("auth.sign_up");
    expect(actions).toContain("auth.email_verified");
    expect(actions).toContain("auth.sign_in_failed");
    const dump = JSON.stringify(rows.results);
    expect(dump).not.toContain(t.email);
    expect(dump).not.toContain(t.password);
  });

  it("cannot be changed or deleted", async () => {
    await createTeacher();
    await expect(env.DB.prepare("UPDATE audit_log SET action = 'x'").run()).rejects.toThrow(/append only/);
    await expect(env.DB.prepare("DELETE FROM audit_log").run()).rejects.toThrow(/append only/);
  });
});
