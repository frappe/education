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

vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("challenges.cloudflare.com")) return Response.json(turnstileAnswer);
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
