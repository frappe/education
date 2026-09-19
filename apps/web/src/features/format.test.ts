import { describe, expect, it } from "vitest";
import { formatDay, formatVnd } from "./format";

describe("format", () => {
  it("shows VND without decimals", () => {
    expect(formatVnd(150000)).toMatch(/^150[.  ]?000 VND$/);
    expect(formatVnd(0)).toBe("0 VND");
  });
  it("shows a day as written, with no time zone shift", () => {
    expect(formatDay("2026-10-01")).toBe("01/10/2026");
    expect(formatDay(null)).toBe("-");
  });
});
