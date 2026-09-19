import { env } from "cloudflare:workers";
import { vi } from "vitest";
import { createApp } from "../src/app";
import type { Env } from "../src/env";

export const app = createApp();

let counter = 0;
export const uniqueEmail = (prefix = "user") => `${prefix}.${Date.now()}.${counter++}@example.com`;
export const randomIp = () =>
  `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

// ---- fake outside world: Turnstile, so tests never use the network
export const turnstileAnswer = { success: true };

/** What Google's token address answers, and what it was asked. Set by `googleSignIn`. */
export const googleFake: {
  answer: ((form: URLSearchParams) => Response | Promise<Response>) | null;
  asked: URLSearchParams[];
} = { answer: null, asked: [] };

vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("challenges.cloudflare.com")) return Response.json(turnstileAnswer);
  if (url === "https://oauth2.googleapis.com/token" && googleFake.answer) {
    const form = new URLSearchParams(String(init?.body));
    googleFake.asked.push(form);
    return googleFake.answer(form);
  }
  throw new Error(`Unexpected network call in test: ${url}`);
});

export interface CallOptions {
  /** Pass a list to receive the work the app hands to waitUntil (like the real runtime does). */
  waitUntil?: Promise<unknown>[];
  method?: string;
  body?: unknown;
  cookie?: string;
  ip?: string;
  headers?: Record<string, string>;
  env?: Partial<Env>;
  noClientHeader?: boolean;
}

export interface CallResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  headers: Headers;
  /** `name=value` of the session cookie the response set, or undefined if none / cleared. */
  cookie?: string;
  setCookie: string | null;
}

export async function call(path: string, opts: CallOptions = {}): Promise<CallResult> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { "cf-connecting-ip": opts.ip ?? randomIp(), ...opts.headers };
  if (method !== "GET" && !opts.noClientHeader) headers["x-lms-client"] = "web";
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers.cookie = opts.cookie;
  const res = await app.request(
    `https://lms.test${path}`,
    { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) },
    { ...env, ...opts.env },
    opts.waitUntil
      ? ({
          waitUntil: (p: Promise<unknown>) => void opts.waitUntil!.push(p),
          passThroughOnException() {},
        } as unknown as ExecutionContext)
      : undefined,
  );
  const text = await res.text();
  const setCookie = res.headers.get("set-cookie");
  const m = setCookie?.match(/^(sid|__Host-sid)=([^;]*)/);
  return {
    status: res.status,
    json: text ? JSON.parse(text) : null,
    headers: res.headers,
    cookie: m && m[2] ? `${m[1]}=${m[2]}` : undefined,
    setCookie,
  };
}

interface OutboxRow {
  kind: string;
  to_email: string;
  body_text: string;
}

export async function emailsTo(email: string): Promise<OutboxRow[]> {
  const res = await env.DB.prepare(
    "SELECT kind, to_email, body_text FROM email_outbox WHERE to_email = ? ORDER BY created_at, id",
  )
    .bind(email)
    .all<OutboxRow>();
  return res.results;
}

/** The token inside the most recent email of this kind sent to this address. */
export async function latestToken(email: string, kind: string): Promise<string> {
  const rows = (await emailsTo(email)).filter((r) => r.kind === kind);
  const last = rows.at(-1);
  const token = last?.body_text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  if (!token) throw new Error(`No ${kind} email with a token for ${email}`);
  return token;
}

export interface Person {
  email: string;
  cookie: string;
  userId: string;
  tenantId: string;
}

/** A signed in, email-confirmed teacher with their own tenant. */
export async function createTeacher(name = "Test Teacher"): Promise<Person> {
  const email = uniqueEmail("teacher");
  const up = await call("/api/auth/sign-up", {
    method: "POST",
    body: { name, email },
  });
  if (up.status !== 202) throw new Error(`sign up failed: ${JSON.stringify(up.json)}`);
  const verified = await call("/api/auth/verify-email", {
    method: "POST",
    body: { token: await latestToken(email, "verify_email") },
  });
  if (!verified.cookie) throw new Error("no session after verify");
  const me = await call("/api/me", { cookie: verified.cookie });
  return {
    email,
    cookie: verified.cookie,
    userId: me.json.user.id,
    tenantId: me.json.memberships[0].tenantId,
  };
}

/** Signs an existing, confirmed person in with an email link and returns the session cookie. */
export async function signInWithLink(email: string, ip?: string): Promise<string> {
  const req = await call("/api/auth/sign-in-link/request", { method: "POST", ip, body: { email } });
  if (req.status !== 202) throw new Error(`link request failed: ${JSON.stringify(req.json)}`);
  const res = await call("/api/auth/sign-in-link/consume", {
    method: "POST",
    ip,
    body: { token: await latestToken(email, "magic_link") },
  });
  if (!res.cookie) throw new Error(`no session from link: ${JSON.stringify(res.json)}`);
  return res.cookie;
}

/** A student invited by `teacher` who accepted the invite. */
export async function createStudent(teacher: Person, name = "Test Student"): Promise<Person> {
  const email = uniqueEmail("student");
  const invited = await call("/api/invites", {
    method: "POST",
    cookie: teacher.cookie,
    body: { name, email },
  });
  if (invited.status !== 202) throw new Error(`invite failed: ${JSON.stringify(invited.json)}`);
  const accepted = await call("/api/invites/accept", {
    method: "POST",
    body: { token: await latestToken(email, "invite") },
  });
  if (!accepted.cookie) throw new Error("no session after accept");
  const me = await call("/api/me", { cookie: accepted.cookie });
  return {
    email,
    cookie: accepted.cookie,
    userId: me.json.user.id,
    tenantId: teacher.tenantId,
  };
}

// ---------------------------------------------------------------- M2 helpers

export const validCourse = (over: Record<string, unknown> = {}) => ({
  name: "English A1",
  description: "Beginner class",
  pricePerLesson: 150000,
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  maxStudents: 10,
  ...over,
});

/** Creates a course for this teacher and returns it. */
export async function createCourse(teacher: Person, over: Record<string, unknown> = {}) {
  const res = await call("/api/courses", { method: "POST", cookie: teacher.cookie, body: validCourse(over) });
  if (res.status !== 201) throw new Error(`create course failed: ${JSON.stringify(res.json)}`);
  return res.json.course as { id: string; version: number; status: string; name: string };
}

/** Adds a student profile (no invite) and returns it. */
export async function addStudent(teacher: Person, over: Record<string, unknown> = {}) {
  const res = await call("/api/students", {
    method: "POST",
    cookie: teacher.cookie,
    body: { name: "Mai", email: uniqueEmail("kid"), ...over },
  });
  if (res.status !== 201) throw new Error(`add student failed: ${JSON.stringify(res.json)}`);
  return res.json.student as { id: string; email: string; version: number; name: string };
}

// ---------------------------------------------------------------- Google sign in

const b64url = (v: unknown) =>
  btoa(JSON.stringify(v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";

export interface GoogleTrip {
  start: CallResult;
  callback: CallResult;
  /** Where the person was sent at the end (a path on our site). */
  location: string;
  /** The session cookie, if the trip signed them in. */
  session?: string;
  /** The claims Google's id token carried. */
  claims: Record<string, unknown>;
}

/**
 * Makes Google's token address answer as if the person signed in at Google. `target` is the address
 * we sent the browser to (it holds the nonce Google must repeat). Returns the claims that were sent.
 */
export function armGoogle(
  target: string,
  o: {
    email: string;
    name?: string;
    sub?: string;
    claims?: Record<string, unknown>;
    answer?: (form: URLSearchParams) => Response | Promise<Response>;
  },
): Record<string, unknown> {
  const claims: Record<string, unknown> = {
    iss: "https://accounts.google.com",
    aud: GOOGLE_CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: o.sub ?? `sub-${o.email}`,
    email: o.email,
    email_verified: true,
    nonce: new URL(target).searchParams.get("nonce"),
    name: o.name ?? "Google Person",
    ...o.claims,
  };
  googleFake.asked = [];
  googleFake.answer =
    o.answer ?? (() => Response.json({ id_token: `${b64url({ alg: "RS256" })}.${b64url(claims)}.sig` }));
  return claims;
}

/**
 * One whole "Continue with Google" trip: start, Google answers, callback. Google is played by the
 * test, so `claims` can be wrong on purpose (bad audience, expired, unverified email...).
 */
export async function googleSignIn(o: {
  email: string;
  name?: string;
  sub?: string;
  intent?: "sign-in" | "sign-up" | "invite";
  invite?: string;
  keep?: boolean;
  claims?: Record<string, unknown>;
  /** Replace the whole answer of Google's token address. */
  answer?: (form: URLSearchParams) => Response | Promise<Response>;
  ip?: string;
  env?: Partial<Env>;
}): Promise<GoogleTrip> {
  const q = new URLSearchParams({ intent: o.intent ?? "sign-in", keep: o.keep === false ? "0" : "1" });
  if (o.invite) q.set("invite", o.invite);
  const ip = o.ip ?? randomIp();
  const start = await call(`/api/auth/google/start?${q}`, { ip, env: o.env });
  const flowCookie = start.setCookie?.match(/(?:^|, )((?:__Host-)?glogin=[^;]+)/)?.[1];
  const target = start.headers.get("location") ?? "";
  let claims: Record<string, unknown> = {};
  let callback = start;
  if (flowCookie && target.startsWith("https://accounts.google.com/")) {
    claims = armGoogle(target, o);
    callback = await call(
      `/api/auth/google/callback?code=code-1&state=${new URL(target).searchParams.get("state")}`,
      { cookie: flowCookie, ip, env: o.env },
    );
  }
  const last = callback.headers.get("location") ?? "";
  return {
    start,
    callback,
    location: last,
    session: callback.setCookie?.match(/(?:^|, )((?:__Host-)?sid=[^;]+)/)?.[1],
    claims,
  };
}
