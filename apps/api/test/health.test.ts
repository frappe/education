import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();
const call = (path: string, init?: RequestInit) => app.request(`https://lms.test${path}`, init, env);

describe("GET /api/health", () => {
  it("reports ok and checks the database", async () => {
    const res = await call("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; database: string };
    expect(body.status).toBe("ok");
    expect(body.database).toBe("ok");
  });

  it("returns only status words (no version or environment info)", async () => {
    const res = await call("/api/health");
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["database", "status", "time"]);
  });

  it("reports degraded when the database fails", async () => {
    const brokenEnv = {
      ...env,
      DB: { prepare: () => ({ first: () => Promise.reject(new Error("boom")) }) },
    };
    const res = await app.request("https://lms.test/api/health", undefined, brokenEnv);
    const body = (await res.json()) as { status: string; database: string };
    expect(body).toMatchObject({ status: "degraded", database: "error" });
  });
});

describe("security headers", () => {
  it("are set on API responses", async () => {
    const res = await call("/api/health");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("permissions-policy")).toContain("microphone=()");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("are set on error responses too", async () => {
    const res = await call("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("errors", () => {
  it("use the shared error shape with a request id", async () => {
    const res = await call("/api/does-not-exist");
    const body = (await res.json()) as { error: { code: string; message: string; requestId: string } };
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message.length).toBeGreaterThan(0);
    expect(body.error.requestId).toBe(res.headers.get("x-request-id"));
  });
});

describe("openapi.json", () => {
  it("is available outside production", async () => {
    const res = await call("/api/openapi.json");
    expect(res.status).toBe(200);
  });

  it("is hidden in production", async () => {
    const res = await app.request("https://lms.test/api/openapi.json", undefined, {
      ...env,
      ENVIRONMENT: "production",
    });
    expect(res.status).toBe(404);
  });
});
