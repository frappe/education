import { describe, expect, it } from "vitest";
import { MAX_REQUEST_BYTES } from "../src/app";
import { call, createTeacher } from "./helpers";

describe("a request that is too big", () => {
  const post = (path: string, text: string, cookie?: string) =>
    call(path, { method: "POST", body: { text }, ...(cookie ? { cookie } : {}) });

  it("is refused before it is read, also without signing in, with a plain message", async () => {
    const big = "x".repeat(MAX_REQUEST_BYTES + 10);
    const anon = await post("/api/auth/sign-in-link/request", big);
    expect(anon.status).toBe(413);
    expect(anon.json.error).toMatchObject({ code: "TOO_LARGE", message: expect.stringMatching(/too big/) });
    expect(anon.json.error.requestId).toBeTruthy();
    const t = await createTeacher();
    expect((await post("/api/courses", big, t.cookie)).status).toBe(413);
    expect((await post("/api/students/import", big, t.cookie)).status).toBe(413);
    // The answer carries the security headers like any other.
    expect(anon.headers.get("cache-control")).toBe("no-store");
    expect(anon.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("does not stop a normal request, even a long one", async () => {
    const t = await createTeacher();
    const long = "x".repeat(60_000); // far more than a person types, well under the limit
    const res = await call("/api/courses", {
      method: "POST",
      cookie: t.cookie,
      body: { name: "English", description: long.slice(0, 1000), pricePerLesson: 100000 },
    });
    expect(res.status).toBe(201);
    // A large but real import (200 students) fits.
    const rows = Array.from({ length: 200 }, (_, i) => ({
      name: `Student ${i} ${"n".repeat(100)}`,
      email: `bulk${i}-${"e".repeat(40)}@example.com`,
      phone: "0901234567",
    }));
    expect(JSON.stringify({ rows, dryRun: true }).length).toBeLessThan(MAX_REQUEST_BYTES);
    expect(
      (await call("/api/students/import", { method: "POST", cookie: t.cookie, body: { rows, dryRun: true } }))
        .status,
    ).toBe(200);
  });
});

describe("what the server offers on sign in", () => {
  const options = (env: Record<string, string | undefined>) =>
    call("/api/auth/options", { env: env as never });

  it("offers the email link only when the bot check is set up (or on a developer's computer)", async () => {
    expect((await options({})).json).toMatchObject({ emailLink: true }); // the test runs count as local
    const live = { ENVIRONMENT: "production", APP_URL: "https://lms.example.com", HMAC_KEY: "k" };
    expect((await options({ ...live, TURNSTILE_SECRET: undefined })).json.emailLink).toBe(false);
    expect((await options({ ...live, TURNSTILE_SECRET: "s" })).json.emailLink).toBe(true);
  });

  it("offers Google only when both the client id and the secret are set, and never the local stand-in", async () => {
    // The test setup has Google settings of its own, so they are cleared here first.
    const live = {
      ENVIRONMENT: "production",
      APP_URL: "https://lms.example.com",
      HMAC_KEY: "k",
      TURNSTILE_SECRET: "s",
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      GOOGLE_MODE: undefined,
    };
    expect((await options({ ...live })).json.google).toBe(false);
    expect((await options({ ...live, GOOGLE_CLIENT_ID: "id" })).json.google).toBe(false);
    expect(
      (await options({ ...live, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" })).json.google,
    ).toBe(true);
    expect((await options({ ...live, GOOGLE_MODE: "dev" })).json.google).toBe(false);
  });
});

describe("what a production server does not show", () => {
  const live = { ENVIRONMENT: "production", APP_URL: "https://lms.example.com", HMAC_KEY: "k" };

  it("hides the description of the API and the outbox of test emails", async () => {
    expect((await call("/api/openapi.json", { env: live as never })).status).toBe(404);
    expect((await call("/api/dev/outbox", { env: live as never })).status).toBe(404);
  });

  it("refuses to send emails to the outbox instead of a real server", async () => {
    const res = await call("/api/auth/sign-in-link/request", {
      method: "POST",
      env: { ...live, EMAIL_MODE: "dev", TURNSTILE_SECRET: "s" } as never,
      body: { email: "someone@example.com", turnstileToken: "x" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400); // never a quiet success
  });
});
