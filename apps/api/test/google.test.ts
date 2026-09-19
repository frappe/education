import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { devGoogleCode } from "../src/google/client";
import {
  addStudent,
  call,
  createStudent,
  createTeacher,
  emailsTo,
  armGoogle,
  googleFake,
  GOOGLE_CLIENT_ID,
  googleSignIn,
  latestToken,
  randomIp,
  signInWithLink,
  uniqueEmail,
} from "./helpers";

const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;
const userCount = (email: string) => count("SELECT COUNT(*) AS n FROM users WHERE email = ?", email);

/** A teacher who invited `email` (by email). Returns the teacher and the invite link's token. */
async function invited(email = uniqueEmail("kid"), name = "Hoa") {
  const teacher = await createTeacher();
  const res = await call("/api/invites", { method: "POST", cookie: teacher.cookie, body: { name, email } });
  expect(res.status).toBe(202);
  return { teacher, email, token: await latestToken(email, "invite") };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Google sign in: the trip", () => {
  it("is only offered when Google is set up", async () => {
    expect((await call("/api/auth/options")).json).toEqual({ google: true });
    const off = { GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined };
    expect((await call("/api/auth/options", { env: off })).json).toEqual({ google: false });
    expect((await call("/api/auth/google/start", { env: off })).status).toBe(404);
    expect((await call("/api/auth/google/callback?code=x&state=y", { env: off })).status).toBe(404);
    // one of the two settings is not enough
    const half = await call("/api/auth/options", { env: { GOOGLE_CLIENT_SECRET: undefined } });
    expect(half.json).toEqual({ google: false });
  });

  it("sends the person to Google with a state, a nonce, and the code check (PKCE)", async () => {
    const res = await call("/api/auth/google/start?intent=sign-up");
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get("location")!);
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const p = url.searchParams;
    expect(p.get("client_id")).toBe(GOOGLE_CLIENT_ID);
    expect(p.get("redirect_uri")).toBe("https://lms.test/api/auth/google/callback");
    expect(p.get("response_type")).toBe("code");
    expect(p.get("scope")).toBe("openid email profile");
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("prompt")).toBe("select_account");
    expect(p.get("state")!.length).toBeGreaterThanOrEqual(40);
    expect(p.get("nonce")!.length).toBeGreaterThanOrEqual(40);
    expect(p.get("code_challenge")!.length).toBeGreaterThanOrEqual(40);
    // No secret and no invite link in the address.
    expect(url.toString()).not.toContain("test-client-secret");
  });

  it("keeps what it needs in a short, signed, HttpOnly cookie", async () => {
    const res = await call("/api/auth/google/start");
    const c = res.setCookie!;
    expect(c).toMatch(/^glogin=/);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=Lax/i);
    expect(c).toMatch(/Max-Age=600/);
    expect(c).toMatch(/Path=\//);
    // in a deployed environment it also gets the __Host- prefix and Secure
    const prod = await call("/api/auth/google/start", {
      env: { ENVIRONMENT: "staging", HMAC_KEY: "k".repeat(32) },
    });
    expect(prod.setCookie).toMatch(/^__Host-glogin=/);
    expect(prod.setCookie).toMatch(/Secure/i);
  });

  it("proves it is the same browser: the code check sent to Google matches the start", async () => {
    const trip = await googleSignIn({ email: uniqueEmail("t"), intent: "sign-up" });
    const asked = googleFake.asked[0]!;
    expect(asked.get("grant_type")).toBe("authorization_code");
    expect(asked.get("code")).toBe("code-1");
    expect(asked.get("client_id")).toBe(GOOGLE_CLIENT_ID);
    expect(asked.get("client_secret")).toBe("test-client-secret");
    expect(asked.get("redirect_uri")).toBe("https://lms.test/api/auth/google/callback");
    const challenge = new URL(trip.start.headers.get("location")!).searchParams.get("code_challenge")!;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(asked.get("code_verifier")!),
    );
    const expected = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(challenge).toBe(expected);
  });

  it("refuses bad start requests and shows a plain error on the sign in page", async () => {
    for (const path of [
      "/api/auth/google/start?intent=hack",
      "/api/auth/google/start?intent=invite", // invite without a link
      "/api/auth/google/start?intent=sign-in&invite=" + "a".repeat(30), // a link on a normal sign in
      "/api/auth/google/start?keep=maybe",
    ]) {
      const res = await call(path);
      expect(res.status, path).toBe(302);
      expect(res.headers.get("location"), path).toBe("/sign-in?error=GOOGLE_FAILED");
      expect(res.setCookie, path).toBeNull();
    }
  });

  it("does not start an invite trip for a link that does not work", async () => {
    const res = await call(`/api/auth/google/start?intent=invite&invite=${"a".repeat(43)}`);
    expect(res.headers.get("location")).toBe("/sign-in?error=LINK_EXPIRED");
    expect(res.setCookie).toBeNull();
  });

  it("slows down someone who starts many trips", async () => {
    const ip = randomIp();
    for (let i = 0; i < 30; i++) {
      expect((await call("/api/auth/google/start", { ip })).headers.get("location")).toContain("google.com");
    }
    const res = await call("/api/auth/google/start", { ip });
    expect(res.headers.get("location")).toBe("/sign-in?error=RATE_LIMITED");
  });
});

describe("Google sign in: coming back", () => {
  it("does nothing without the cookie from the start", async () => {
    const res = await call("/api/auth/google/callback?code=x&state=y");
    expect(res.headers.get("location")).toBe("/sign-in?error=GOOGLE_FAILED");
    expect(res.setCookie).not.toMatch(/sid=/);
  });

  it("refuses a state that is not the one we made (someone else's sign in forced on this browser)", async () => {
    const email = uniqueEmail("state");
    const start = await call("/api/auth/google/start?intent=sign-up");
    const cookie = start.setCookie!.match(/^(glogin=[^;]+)/)![1]!;
    armGoogle(start.headers.get("location")!, { email }); // Google would say yes, if it were asked
    for (const state of ["wrong", ""]) {
      const res = await call(`/api/auth/google/callback?code=x&state=${state}`, { cookie });
      expect(res.headers.get("location")).toBe("/sign-in?error=GOOGLE_FAILED");
    }
    expect(await userCount(email)).toBe(0);
    expect(googleFake.asked).toEqual([]); // Google was never asked
  });

  it("refuses a cookie that was changed", async () => {
    const email = uniqueEmail("forged");
    const start = await call("/api/auth/google/start?intent=sign-in");
    const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const cookie = start.setCookie!.match(/^(glogin=[^;]+)/)![1]!;
    armGoogle(start.headers.get("location")!, { email }); // Google would say yes, if it were asked
    // Turn the intent into "sign-up" without knowing the key: the signature no longer fits.
    const [payload, mac] = cookie.slice("glogin=".length).split(".");
    const json = JSON.parse(atob(payload!.replace(/-/g, "+").replace(/_/g, "/")));
    json.intent = "sign-up";
    const forged = btoa(JSON.stringify(json)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const res = await call(`/api/auth/google/callback?code=x&state=${state}`, {
      cookie: `glogin=${forged}.${mac}`,
    });
    expect(res.headers.get("location")).toBe("/sign-in?error=GOOGLE_FAILED");
    // and a cookie with no signature at all
    const bare = await call(`/api/auth/google/callback?code=x&state=${state}`, {
      cookie: `glogin=${payload}`,
    });
    expect(bare.headers.get("location")).toBe("/sign-in?error=GOOGLE_FAILED");
    expect(await userCount(email)).toBe(0); // the forged "sign-up" made nothing
  });

  it("refuses a trip that took longer than 10 minutes", async () => {
    const email = uniqueEmail("slow");
    const start = await call("/api/auth/google/start?intent=sign-up");
    const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const cookie = start.setCookie!.match(/^(glogin=[^;]+)/)![1]!;
    armGoogle(start.headers.get("location")!, { email });
    // Google's own id token would still be valid (an hour), only our 10 minute limit says no.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 11 * 60_000 });
    const res = await call(`/api/auth/google/callback?code=x&state=${state}`, { cookie });
    expect(res.headers.get("location")).toBe("/sign-in?error=GOOGLE_FAILED");
    expect(await userCount(email)).toBe(0);
  });

  it("removes the cookie when the person comes back", async () => {
    const trip = await googleSignIn({ email: uniqueEmail("t"), intent: "sign-up" });
    expect(trip.callback.setCookie).toMatch(/glogin=;/);
  });

  it("goes back quietly when the person pressed Cancel at Google", async () => {
    const start = await call("/api/auth/google/start");
    const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const cookie = start.setCookie!.match(/^(glogin=[^;]+)/)![1]!;
    const res = await call(`/api/auth/google/callback?error=access_denied&state=${state}`, { cookie });
    expect(res.headers.get("location")).toBe("/sign-in");
  });

  it("goes back to the invite, not the sign in page, when an invite trip is cancelled", async () => {
    const { token } = await invited();
    const start = await call(`/api/auth/google/start?intent=invite&invite=${token}`);
    const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const cookie = start.setCookie!.match(/^(glogin=[^;]+)/)![1]!;
    const res = await call(`/api/auth/google/callback?error=access_denied&state=${state}`, { cookie });
    expect(res.headers.get("location")).toBe(`/accept-invite?token=${token}`);
  });
});

describe("Google sign in: checking what Google says", () => {
  const bad: [string, Record<string, unknown>][] = [
    ["a different app's id token (audience)", { aud: "someone-elses-app" }],
    ["two audiences", { aud: [GOOGLE_CLIENT_ID, "another"] }],
    ["not from Google (issuer)", { iss: "https://evil.example" }],
    ["an id token that ran out", { exp: Math.floor(Date.now() / 1000) - 10 }],
    ["a different nonce (replayed id token)", { nonce: "someone-elses-nonce" }],
    ["no nonce", { nonce: undefined }],
    ["an email Google has not confirmed", { email_verified: false }],
    ["no email confirmation at all", { email_verified: undefined }],
    ["no email", { email: undefined }],
    ["no account id", { sub: undefined }],
  ];

  for (const [label, claims] of bad) {
    it(`refuses ${label}`, async () => {
      const email = uniqueEmail("t");
      const trip = await googleSignIn({ email, intent: "sign-up", claims });
      expect(trip.location).toBe("/sign-in?error=GOOGLE_FAILED");
      expect(trip.session).toBeUndefined();
      expect(await userCount(email)).toBe(0);
    });
  }

  it("accepts the string 'true' for email_verified, as Google sometimes sends it", async () => {
    const trip = await googleSignIn({
      email: uniqueEmail("t"),
      intent: "sign-up",
      claims: { email_verified: "true" },
    });
    expect(trip.session).toBeDefined();
  });

  it("accepts the older issuer name without https", async () => {
    const trip = await googleSignIn({
      email: uniqueEmail("t"),
      intent: "sign-up",
      claims: { iss: "accounts.google.com" },
    });
    expect(trip.session).toBeDefined();
  });

  it("shows a plain error when Google is down, refuses us, or sends nonsense", async () => {
    const answers: [string, (f: URLSearchParams) => Response | Promise<Response>][] = [
      ["a refusal", () => new Response("no", { status: 400 })],
      ["a server error", () => new Response("no", { status: 503 })],
      ["no id token", () => Response.json({ access_token: "x" })],
      ["an id token that is not a token", () => Response.json({ id_token: "garbage" })],
      ["nothing readable", () => new Response("<html>", { status: 200 })],
      [
        "no answer",
        () => {
          throw new Error("network down");
        },
      ],
    ];
    for (const [label, answer] of answers) {
      const email = uniqueEmail("t");
      const trip = await googleSignIn({ email, intent: "sign-up", answer });
      expect(trip.location, label).toBe("/sign-in?error=GOOGLE_FAILED");
      expect(await userCount(email), label).toBe(0);
    }
  });

  it("never writes Google's answer or the secret to the log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await googleSignIn({
      email: uniqueEmail("t"),
      intent: "sign-up",
      answer: () => new Response("secret-detail-from-google", { status: 400 }),
    });
    const logged = spy.mock.calls.map((c) => String(c[0])).join("\n");
    spy.mockRestore();
    expect(logged).toContain("google code exchange refused");
    expect(logged).not.toContain("secret-detail-from-google");
    expect(logged).not.toContain("test-client-secret");
  });
});

describe("Google sign in: teachers", () => {
  it("makes a teacher account with its own classroom, and signs them in", async () => {
    const email = uniqueEmail("t");
    const trip = await googleSignIn({ email, name: "Lan Tran", intent: "sign-up" });
    expect(trip.location).toBe("/");
    const me = await call("/api/me", { cookie: trip.session });
    expect(me.status).toBe(200);
    expect(me.json.user).toMatchObject({ email, name: "Lan Tran", emailVerified: true });
    expect(me.json.memberships).toHaveLength(1);
    expect(me.json.memberships[0]).toMatchObject({ role: "teacher", tenantName: "Lan Tran's classroom" });
    // No email was needed, and none was sent.
    expect(await emailsTo(email)).toHaveLength(0);
    // The teacher can use the app straight away, invites included (their email is confirmed).
    const inv = await call("/api/invites", {
      method: "POST",
      cookie: trip.session,
      body: { name: "Kid", email: uniqueEmail("kid") },
    });
    expect(inv.status).toBe(202);
  });

  it("puts the sign up in the audit log", async () => {
    const email = uniqueEmail("t");
    await googleSignIn({ email, intent: "sign-up" });
    const rows = await env.DB.prepare(
      `SELECT a.action FROM audit_log a JOIN users u ON u.id = a.actor_user_id WHERE u.email = ? ORDER BY a.at`,
    )
      .bind(email)
      .all<{ action: string }>();
    const actions = rows.results.map((r) => r.action);
    expect(actions).toContain("auth.sign_up");
    expect(actions).toContain("auth.google_sign_up");
  });

  it("signs the same teacher in again without making a second classroom", async () => {
    const email = uniqueEmail("t");
    const first = await googleSignIn({ email, intent: "sign-up" });
    const again = await googleSignIn({ email, intent: "sign-in" });
    const again2 = await googleSignIn({ email, intent: "sign-up" }); // pressing "sign up" twice
    const a = (await call("/api/me", { cookie: first.session })).json;
    const b = (await call("/api/me", { cookie: again.session })).json;
    const c = (await call("/api/me", { cookie: again2.session })).json;
    expect(b.user.id).toBe(a.user.id);
    expect(c.user.id).toBe(a.user.id);
    expect(await count("SELECT COUNT(*) AS n FROM memberships WHERE user_id = ?", a.user.id)).toBe(1);
    expect(await count("SELECT COUNT(*) AS n FROM identities WHERE user_id = ?", a.user.id)).toBe(1);
  });

  it("does not make an account when someone presses Sign in with an unknown email", async () => {
    const email = uniqueEmail("nobody");
    const trip = await googleSignIn({ email, intent: "sign-in" });
    expect(trip.location).toBe("/sign-in?error=NOT_INVITED");
    expect(trip.session).toBeUndefined();
    expect(await userCount(email)).toBe(0);
  });

  it("limits how many teacher accounts one connection can make", async () => {
    const ip = randomIp();
    for (let i = 0; i < 10; i++) {
      expect((await googleSignIn({ email: uniqueEmail("t"), intent: "sign-up", ip })).session).toBeDefined();
    }
    const trip = await googleSignIn({ email: uniqueEmail("t"), intent: "sign-up", ip });
    expect(trip.location).toBe("/sign-in?error=RATE_LIMITED");
    expect(trip.session).toBeUndefined();
  });

  it("links Google to a teacher who signed up with an email link (same email)", async () => {
    const teacher = await createTeacher();
    const trip = await googleSignIn({ email: teacher.email, intent: "sign-in", sub: "g-teacher" });
    expect(trip.session).toBeDefined();
    const me = (await call("/api/me", { cookie: trip.session })).json;
    expect(me.user.id).toBe(teacher.userId);
    // and the email link keeps working
    expect(await signInWithLink(teacher.email)).toBeDefined();
  });

  it("confirms the email of a teacher who never pressed the confirm link", async () => {
    const email = uniqueEmail("t");
    await call("/api/auth/sign-up", { method: "POST", body: { name: "Late", email } });
    const trip = await googleSignIn({ email, intent: "sign-in" });
    const me = (await call("/api/me", { cookie: trip.session })).json;
    expect(me.user.emailVerified).toBe(true);
  });

  it("uses Google's id, not the email, once a Google account is linked", async () => {
    const teacher = await createTeacher();
    await googleSignIn({ email: teacher.email, sub: "g-1" });
    // The same Google account, now with another email on it: still the same person.
    const trip = await googleSignIn({ email: uniqueEmail("renamed"), sub: "g-1" });
    const me = (await call("/api/me", { cookie: trip.session })).json;
    expect(me.user.id).toBe(teacher.userId);
  });

  it("does not hand an account to a different Google account that has the same email", async () => {
    const teacher = await createTeacher();
    await googleSignIn({ email: teacher.email, sub: "g-original" });
    const trip = await googleSignIn({ email: teacher.email, sub: "g-someone-else" });
    expect(trip.location).toBe("/sign-in?error=GOOGLE_ACCOUNT_CHANGED");
    expect(trip.session).toBeUndefined();
    expect(await count("SELECT COUNT(*) AS n FROM identities WHERE user_id = ?", teacher.userId)).toBe(1);
  });

  it("does not let a paused account in", async () => {
    const teacher = await createTeacher();
    await env.DB.prepare("UPDATE users SET disabled_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), teacher.userId)
      .run();
    const trip = await googleSignIn({ email: teacher.email });
    expect(trip.location).toBe("/sign-in?error=ACCOUNT_PAUSED");
    expect(trip.session).toBeUndefined();
  });

  it("does not let in someone whose classroom is paused", async () => {
    const teacher = await createTeacher();
    await env.DB.prepare("UPDATE tenants SET status = 'suspended' WHERE id = ?").bind(teacher.tenantId).run();
    const trip = await googleSignIn({ email: teacher.email });
    expect(trip.location).toBe("/sign-in?error=ACCOUNT_PAUSED");
  });
});

describe("Google sign in: students (only the email the teacher added and invited)", () => {
  it("lets in a student whose exact email was invited, without opening the invite link", async () => {
    const { teacher, email } = await invited();
    const trip = await googleSignIn({ email, name: "Hoa Nguyen" });
    expect(trip.location).toBe("/");
    const me = (await call("/api/me", { cookie: trip.session })).json;
    expect(me.user.email).toBe(email);
    expect(me.memberships).toEqual([
      expect.objectContaining({ role: "student", tenantId: teacher.tenantId }),
    ]);
    // The teacher sees the student as joined, with the name the teacher typed.
    const list = await call("/api/students", { cookie: teacher.cookie });
    const s = list.json.students.find((x: { email: string }) => x.email === email);
    expect(s).toMatchObject({ name: "Hoa", access: "joined" });
  });

  it("uses up the invite, so the link from the email cannot be used afterwards", async () => {
    const { email, token } = await invited();
    await googleSignIn({ email });
    const late = await call("/api/invites/accept", { method: "POST", body: { token } });
    expect(late.status).toBe(410);
  });

  it("compares the email exactly, ignoring only upper and lower case", async () => {
    const { email } = await invited("hoa.nguyen@example.com");
    for (const wrong of ["hoanguyen@example.com", "hoa.nguyen+1@example.com", "hoa.nguyen@example.org"]) {
      const trip = await googleSignIn({ email: wrong });
      expect(trip.location, wrong).toBe("/sign-in?error=NOT_INVITED");
      expect(trip.session, wrong).toBeUndefined();
      expect(await userCount(wrong), wrong).toBe(0);
    }
    const ok = await googleSignIn({ email: email.toUpperCase() });
    expect(ok.session).toBeDefined();
  });

  it("does not let in a student who was added but not invited", async () => {
    const teacher = await createTeacher();
    const s = await addStudent(teacher);
    const trip = await googleSignIn({ email: s.email });
    expect(trip.location).toBe("/sign-in?error=NOT_INVITED");
    expect(await userCount(s.email)).toBe(0);
  });

  it("does not let in a student whose invite was cancelled", async () => {
    const { teacher, email } = await invited();
    const list = await call("/api/invites", { cookie: teacher.cookie });
    const id = list.json.invites.find((i: { email: string }) => i.email === email).studentId;
    await call(`/api/invites/${id}`, { method: "DELETE", cookie: teacher.cookie });
    expect((await googleSignIn({ email })).location).toBe("/sign-in?error=NOT_INVITED");
  });

  it("does not let in a student whose invite ran out", async () => {
    const { email } = await invited();
    await env.DB.prepare("UPDATE auth_tokens SET expires_at = ? WHERE email = ? AND kind = 'invite'")
      .bind(new Date(Date.now() - 1000).toISOString(), email)
      .run();
    expect((await googleSignIn({ email })).location).toBe("/sign-in?error=NOT_INVITED");
  });

  it("does not let in an invite from a paused classroom", async () => {
    const { teacher, email } = await invited();
    await env.DB.prepare("UPDATE tenants SET status = 'suspended' WHERE id = ?").bind(teacher.tenantId).run();
    expect((await googleSignIn({ email })).location).toBe("/sign-in?error=NOT_INVITED");
  });

  it("does not let in an archived student", async () => {
    const { teacher, email } = await invited();
    await env.DB.prepare("UPDATE students SET status = 'archived' WHERE tenant_id = ? AND email = ?")
      .bind(teacher.tenantId, email)
      .run();
    expect((await googleSignIn({ email })).location).toBe("/sign-in?error=NOT_INVITED");
  });

  it("joins every class that invited this email", async () => {
    const email = uniqueEmail("kid");
    const t1 = await createTeacher();
    const t2 = await createTeacher();
    for (const t of [t1, t2]) {
      await call("/api/invites", { method: "POST", cookie: t.cookie, body: { name: "Hoa", email } });
    }
    const trip = await googleSignIn({ email });
    const me = (await call("/api/me", { cookie: trip.session })).json;
    expect(me.memberships.map((m: { tenantId: string }) => m.tenantId).sort()).toEqual(
      [t1.tenantId, t2.tenantId].sort(),
    );
    expect(await count("SELECT COUNT(*) AS n FROM users WHERE email = ?", email)).toBe(1);
  });

  it("adds a new class to a student who already has an account", async () => {
    const t1 = await createTeacher();
    const student = await createStudent(t1);
    const t2 = await createTeacher();
    await call("/api/invites", {
      method: "POST",
      cookie: t2.cookie,
      body: { name: "Hoa", email: student.email },
    });
    const trip = await googleSignIn({ email: student.email });
    const me = (await call("/api/me", { cookie: trip.session })).json;
    expect(me.user.id).toBe(student.userId);
    expect(me.memberships).toHaveLength(2);
  });

  it("writes who joined, and how, in the audit log", async () => {
    const { teacher, email } = await invited();
    await googleSignIn({ email });
    const row = await env.DB.prepare(
      "SELECT meta FROM audit_log WHERE tenant_id = ? AND action = 'student.invite_accepted'",
    )
      .bind(teacher.tenantId)
      .first<{ meta: string }>();
    expect(JSON.parse(row!.meta)).toEqual({ via: "google" });
  });

  it("the sign in link and Google both keep working for the same student", async () => {
    const { email } = await invited();
    await googleSignIn({ email });
    expect(await signInWithLink(email)).toBeDefined();
    expect((await googleSignIn({ email })).session).toBeDefined();
  });
});

describe("Google sign in: opening the invite link first", () => {
  it("joins that class when Google gives exactly the invited email", async () => {
    const { teacher, email, token } = await invited();
    const trip = await googleSignIn({ email, intent: "invite", invite: token });
    expect(trip.location).toBe("/");
    const me = (await call("/api/me", { cookie: trip.session })).json;
    expect(me.memberships).toEqual([
      expect.objectContaining({ role: "student", tenantId: teacher.tenantId }),
    ]);
    expect((await call("/api/invites/accept", { method: "POST", body: { token } })).status).toBe(410);
  });

  it("refuses another Google email, sends the student back to the invite, and keeps the link usable", async () => {
    const { email, token } = await invited();
    const other = uniqueEmail("other");
    const trip = await googleSignIn({ email: other, intent: "invite", invite: token });
    expect(trip.location).toBe(`/accept-invite?token=${token}&error=NOT_INVITED`);
    expect(trip.session).toBeUndefined();
    expect(await userCount(other)).toBe(0);
    // The student can try again with the right Google account, or use the link from the email.
    expect((await googleSignIn({ email, intent: "invite", invite: token })).session).toBeDefined();
  });

  it("keeps the emailed link usable after a wrong Google account", async () => {
    const { token } = await invited();
    await googleSignIn({ email: uniqueEmail("other"), intent: "invite", invite: token });
    const res = await call("/api/invites/accept", { method: "POST", body: { token } });
    expect(res.status).toBe(200);
  });

  it("does not use an invite link on a normal trip (the link must match the trip)", async () => {
    const { email, token } = await invited();
    // "sign-in" with someone else's link in the address is refused at the start
    const res = await call(`/api/auth/google/start?intent=sign-in&invite=${token}`);
    expect(res.headers.get("location")).toBe("/sign-in?error=GOOGLE_FAILED");
    expect(await userCount(email)).toBe(0);
  });

  it("does not use up an invite that another person already used", async () => {
    const { email, token } = await invited();
    await call("/api/invites/accept", { method: "POST", body: { token } });
    const trip = await googleSignIn({ email, intent: "invite", invite: token });
    expect(trip.location).toBe("/sign-in?error=LINK_EXPIRED");
  });

  it("a cancelled or replaced invite link stops working", async () => {
    const { teacher, email, token } = await invited();
    const list = await call("/api/invites", { cookie: teacher.cookie });
    const id = list.json.invites.find((i: { email: string }) => i.email === email).studentId;
    await call(`/api/invites/${id}/resend`, { method: "POST", cookie: teacher.cookie, body: {} });
    const trip = await googleSignIn({ email, intent: "invite", invite: token });
    expect(trip.location).toBe("/sign-in?error=LINK_EXPIRED");
  });
});

describe("how long people stay signed in", () => {
  const idle = async (cookie: string) => {
    const value = cookie.split("=")[1]!;
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    return (await env.DB.prepare("SELECT idle_days, expires_at FROM sessions WHERE token_hash = ?")
      .bind(hash)
      .first<{ idle_days: number; expires_at: string }>())!;
  };

  it("keeps a student signed in for a month on their own device, and one day on a shared one", async () => {
    const a = await invited();
    const own = await googleSignIn({ email: a.email, keep: true });
    expect((await idle(own.session!)).idle_days).toBe(30);
    const b = await invited();
    const shared = await googleSignIn({ email: b.email, keep: false });
    expect((await idle(shared.session!)).idle_days).toBe(1);
  });

  it("ends every session after 90 days at the latest", async () => {
    const trip = await googleSignIn({ email: uniqueEmail("t"), intent: "sign-up" });
    const days = (new Date((await idle(trip.session!)).expires_at).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(89.9);
    expect(days).toBeLessThan(90.1);
  });
});

describe("the local stand-in for Google", () => {
  const dev = { GOOGLE_MODE: "dev" as const };

  it("sends the browser to a local page, and signs in with the email typed there", async () => {
    const email = uniqueEmail("dev");
    const start = await call("/api/auth/google/start?intent=sign-up", { env: dev });
    const target = new URL(start.headers.get("location")!);
    expect(target.origin + target.pathname).toBe("https://lms.test/dev/google");
    const cookie = start.setCookie!.match(/^(glogin=[^;]+)/)![1]!;
    const res = await call(
      `/api/auth/google/callback?code=${devGoogleCode(email, "Dev Person")}&state=${target.searchParams.get("state")}`,
      { cookie, env: dev },
    );
    expect(res.headers.get("location")).toBe("/");
    expect(res.setCookie).toMatch(/sid=/);
    expect(await userCount(email)).toBe(1);
  });

  it("is switched off on a deployed address, even when set by mistake", async () => {
    for (const environment of ["staging", "production"] as const) {
      const settings = {
        ...dev,
        ENVIRONMENT: environment,
        HMAC_KEY: "k".repeat(32),
        APP_URL: "https://x.example",
      };
      expect((await call("/api/auth/options", { env: settings })).json).toEqual({ google: false });
      expect((await call("/api/auth/google/start", { env: settings })).status).toBe(404);
      // and a made-up code cannot be used to sign in
      const cb = await call(`/api/auth/google/callback?code=${devGoogleCode("a@b.co", "A")}&state=x`, {
        env: settings,
      });
      expect(cb.status).toBe(404);
    }
  });

  it("does not accept a made-up code when the stand-in is off", async () => {
    const email = uniqueEmail("fake");
    const start = await call("/api/auth/google/start?intent=sign-up"); // real (stubbed) Google
    const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const cookie = start.setCookie!.match(/^(glogin=[^;]+)/)![1]!;
    googleFake.answer = () => new Response("bad", { status: 400 });
    const res = await call(`/api/auth/google/callback?code=${devGoogleCode(email, "X")}&state=${state}`, {
      cookie,
    });
    expect(res.headers.get("location")).toBe("/sign-in?error=GOOGLE_FAILED");
    expect(await userCount(email)).toBe(0);
  });
});
