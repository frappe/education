import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { DevEmailProvider } from "../src/email/dev-provider";
import { getEmailProvider } from "../src/email/provider";
import { randomToken, sha256Hex, timingSafeEqual } from "../src/lib/crypto";
import { uuidv7 } from "../src/lib/id";

describe("uuidv7", () => {
  it("has the right shape, version and variant", () => {
    const id = uuidv7();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("is unique and sorts by time", () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_700_000_001_000);
    expect(a < b).toBe(true);
    expect(new Set(Array.from({ length: 1000 }, () => uuidv7())).size).toBe(1000);
  });
});

describe("tokens", () => {
  it("are 256 bit and url safe", () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(t);
  });

  it("hash to a stable 64 character value", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("compare safely", () => {
    expect(timingSafeEqual("secret", "secret")).toBe(true);
    expect(timingSafeEqual("secret", "secreT")).toBe(false);
    expect(timingSafeEqual("short", "a much longer value")).toBe(false);
  });
});

describe("email provider", () => {
  it("dev mode stores the message in the outbox", async () => {
    await getEmailProvider(env).send({
      kind: "magic_link",
      to: "student@example.com",
      subject: "Your sign in link",
      text: "https://lms.test/link/abc",
    });
    const row = await env.DB.prepare("SELECT * FROM email_outbox WHERE to_email = ?")
      .bind("student@example.com")
      .first<{
        status: string;
        body_text: string;
      }>();
    expect(row?.status).toBe("logged");
    expect(row?.body_text).toContain("/link/abc");
  });

  it("refuses to run in an unknown mode instead of silently dropping mail", () => {
    expect(() => getEmailProvider({ ...env, EMAIL_MODE: "cloudflare" })).toThrow();
  });

  it("dev provider can be used directly", () => {
    expect(new DevEmailProvider(env.DB)).toBeDefined();
  });
});
