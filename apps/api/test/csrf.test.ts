import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();
const post = (headers: Record<string, string>) =>
  app.request("https://lms.test/api/health", { method: "POST", headers }, env);

// /api/health has no POST route, so a request that passes the CSRF check gets 404
// (or 405). A request that fails the check gets 403 ORIGIN_NOT_ALLOWED.
describe("CSRF protection on unsafe methods", () => {
  it("blocks a request without the client header", async () => {
    const res = await post({});
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("blocks a request from another site (Sec-Fetch-Site: cross-site)", async () => {
    const res = await post({ "x-lms-client": "web", "sec-fetch-site": "cross-site" });
    expect(res.status).toBe(403);
  });

  it("blocks a request with a different Origin", async () => {
    const res = await post({ "x-lms-client": "web", origin: "https://evil.example" });
    expect(res.status).toBe(403);
  });

  it("blocks an Origin that is not a valid URL", async () => {
    const res = await post({ "x-lms-client": "web", origin: "not a url" });
    expect(res.status).toBe(403);
  });

  it("lets a same-origin request with the client header through", async () => {
    const res = await post({
      "x-lms-client": "web",
      origin: "https://lms.test",
      "sec-fetch-site": "same-origin",
    });
    expect(res.status).not.toBe(403);
  });

  it("does not check safe methods", async () => {
    const res = await app.request(
      "https://lms.test/api/health",
      { headers: { "sec-fetch-site": "cross-site" } },
      env,
    );
    expect(res.status).toBe(200);
  });
});
