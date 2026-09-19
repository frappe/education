import { describe, expect, it } from "vitest";
import { isLocalHost } from "./isLocalHost";

describe("isLocalHost", () => {
  it("is true only for the developer's own computer", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("ptv-lms.example.workers.dev")).toBe(false);
    expect(isLocalHost("localhost.evil.example")).toBe(false);
  });
});
