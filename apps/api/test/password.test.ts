import { describe, expect, it } from "vitest";
import { ARGON2_PARAMS, hashPassword, needsRehash, verifyPassword } from "../src/auth/password";

describe("password hashing (Argon2id)", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("uses a new salt every time", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
  });

  it("treats equal-looking unicode as the same password (NFKC)", async () => {
    const hash = await hashPassword("café-pass-123");
    expect(await verifyPassword("café-pass-123", hash)).toBe(true);
  });

  it("rejects bad or tampered values without throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "$argon2id$v=19$m=999999999,t=2,p=1$AAAA$AAAA")).toBe(false);
  });

  it("flags weaker hashes for upgrade", async () => {
    expect(needsRehash(await hashPassword("x"))).toBe(false);
    expect(needsRehash("$argon2id$v=19$m=4096,t=1,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAA")).toBe(true);
    expect(needsRehash("garbage")).toBe(true);
  });

  it("is fast enough for a sign in request (spike: 149 ms on a laptop)", async () => {
    const t0 = performance.now();
    await hashPassword("timing check");
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(ARGON2_PARAMS.m).toBe(19456);
  });
});
