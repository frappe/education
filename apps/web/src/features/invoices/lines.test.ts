import { describe, expect, it } from "vitest";
import { amountOf, linesPayload, lineIsValid, newRow, parseMoney, sameAsSaved, totalOf } from "./lines";
import { periodLabel, shiftPeriod } from "./period";
import { sheetOf } from "./sheet";
import { rowsOf } from "./lines";

describe("reading money", () => {
  it("accepts separators between digits and a minus sign", () => {
    expect(parseMoney("100000")).toBe(100000);
    expect(parseMoney("100.000")).toBe(100000);
    expect(parseMoney("100,000")).toBe(100000);
    expect(parseMoney(" 1 200 000 ")).toBe(1200000);
    expect(parseMoney("-50.000")).toBe(-50000);
  });
  it("refuses anything else", () => {
    for (const t of ["", "abc", "12a", "1e3", "--5", "5-", "10.5x", "-"]) expect(parseMoney(t), t).toBeNaN();
  });
});

describe("lines of a receipt", () => {
  const row = (d: string, q: string, p: string, id?: string) =>
    newRow({ description: d, quantity: q, unitPrice: p, id });
  it("works out the amounts and the total, and counts a wrong line as 0", () => {
    const rows = [
      row("A", "4", "100.000"),
      row("Book", "1", "60000"),
      row("Discount", "1", "-50000"),
      row("Bad", "x", "5"),
    ];
    expect(rows.map(amountOf)).toEqual([400000, 60000, -50000, 0]);
    expect(totalOf(rows)).toBe(410000);
  });
  it("checks a line", () => {
    expect(lineIsValid(row("A", "1", "0"))).toBe(true);
    expect(lineIsValid(row(" ", "1", "5"))).toBe(false);
    expect(lineIsValid(row("A", "0", "5"))).toBe(false);
    expect(lineIsValid(row("A", "1001", "5"))).toBe(false);
    expect(lineIsValid(row("A", "1", ""))).toBe(false);
  });
  it("sends numbers and only the ids of lines that came from the server", () => {
    expect(linesPayload([row(" A ", "2", "1.500", "l_1"), row("B", "1", "5")])).toEqual([
      { id: "l_1", description: "A", quantity: 2, unitPrice: 1500 },
      { description: "B", quantity: 1, unitPrice: 5 },
    ]);
  });
  it("tells if the lines on screen are the saved ones", () => {
    const saved = [
      { id: "l_1", courseId: null, description: "A", quantity: 2, unitPrice: 1500, amount: 3000, dates: [] },
    ];
    expect(sameAsSaved([row("A", "2", "1500", "l_1")], saved)).toBe(true);
    expect(sameAsSaved([row("A", "3", "1500", "l_1")], saved)).toBe(false);
    expect(sameAsSaved([], saved)).toBe(false);
    expect(sameAsSaved([row("A", "2", "1500")], saved)).toBe(false);
  });
});

describe("months", () => {
  it("moves over the end of a year", () => {
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-09", 0)).toBe("2026-09");
    expect(shiftPeriod("2026-09", 14)).toBe("2027-11");
  });
  it("writes a month in words", () => {
    expect(periodLabel("2026-09")).toBe("September 2026");
  });
});

describe("lines made from lessons", () => {
  const line = (courseId: string | null) => ({
    id: "l_1",
    courseId,
    description: "A",
    quantity: 3,
    unitPrice: 150000,
    amount: 450000,
    dates: ["2026-09-01"],
  });
  it("tells which lines are counted in lessons, in the form and on the receipt", () => {
    expect(rowsOf([line("c_1"), line(null)]).map((r) => r.perLesson)).toEqual([true, false]);
    const inv = { lines: [line("c_1"), line(null)] } as unknown as Parameters<typeof sheetOf>[0];
    expect(sheetOf(inv).lines.map((l) => l.perLesson)).toEqual([true, false]);
  });
});
