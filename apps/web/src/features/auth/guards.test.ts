import type { MeResponse } from "@lms/shared";
import { describe, expect, it } from "vitest";
import { decideRoute, safeNext } from "./guards";

const me = (role: "teacher" | "student"): MeResponse => ({
  user: { id: "u", name: "N", email: "n@e.co", emailVerified: true },
  memberships: [{ tenantId: "t", tenantName: "T", role }],
});

describe("decideRoute", () => {
  it("sends a signed out person to sign in and remembers where they wanted to go", () => {
    expect(decideRoute({ requiresAuth: true }, null, "/devices")).toBe("/sign-in?next=%2Fdevices");
  });
  it("lets a signed in person in", () => {
    expect(decideRoute({ requiresAuth: true }, me("student"), "/devices")).toBe("ok");
  });
  it("keeps students out of teacher pages", () => {
    expect(decideRoute({ requiresTeacher: true }, me("student"), "/x")).toBe("/");
    expect(decideRoute({ requiresTeacher: true }, me("teacher"), "/x")).toBe("ok");
  });
  it("sends signed in people away from the sign in page", () => {
    expect(decideRoute({ guestOnly: true }, me("teacher"), "/sign-in")).toBe("/");
    expect(decideRoute({ guestOnly: true }, null, "/sign-in")).toBe("ok");
  });
  it("leaves public pages alone", () => {
    expect(decideRoute({}, null, "/verify-email")).toBe("ok");
  });
});

describe("safeNext", () => {
  it("keeps addresses inside this site", () => {
    expect(safeNext("/devices")).toBe("/devices");
    expect(safeNext("/a?b=1")).toBe("/a?b=1");
  });
  it("refuses other sites and tricks", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      undefined,
      5,
      "",
    ]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
