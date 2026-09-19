import { describe, expect, it } from "vitest";
import { fill } from "./text";

describe("fill", () => {
  it("puts values into a message", () => {
    expect(fill("{n} students, page {page}", { n: 3, page: 1 })).toBe("3 students, page 1");
  });
  it("leaves nothing behind for a missing value", () => {
    expect(fill("Hi {name}", {})).toBe("Hi ");
  });
});
