import { describe, expect, it } from "vitest";
import { cleanMoney, caretAfter, groupDigits } from "../money";
import {
  amountsOf,
  linesPayload,
  lineIsValid,
  newRow,
  parseMoney,
  sameAsSaved,
  totalOf,
  type LineRow,
} from "./lines";
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

const course = (description: string, quantity: string, price: string, id?: string) =>
  newRow({ kind: "course", courseId: "c_1", description, quantity, unitPrice: price, id });
const other = (description: string, amount: string, id?: string) =>
  newRow({ kind: "other", description, unitPrice: amount, id });
const discount = (type: "percent" | "fixed", value: string, id?: string) =>
  newRow({ kind: "discount", discountType: type, discountValue: value, id });
const words = (d: { type: string; value: number }) => `Discount ${d.type} ${d.value}`;

describe("lines of a receipt", () => {
  it("works out the amounts and the total, and counts a wrong line as 0", () => {
    const rows = [course("A", "4", "100.000"), other("Book", "60000"), course("Bad", "x", "5"), newRow()];
    expect(amountsOf(rows)).toEqual([400000, 60000, 0, 0]);
    expect(totalOf(rows)).toBe(460000);
  });
  it("takes a discount off the other lines: a percentage is rounded, a fixed amount is as it is", () => {
    const base = [course("A", "1", "100.005"), other("Book", "60000")]; // 160.005
    expect(amountsOf([...base, discount("percent", "10")])).toEqual([100005, 60000, -16001]);
    expect(totalOf([...base, discount("percent", "10")])).toBe(144004);
    expect(amountsOf([...base, discount("fixed", "50.000")])[2]).toBe(-50000);
    expect(amountsOf([...base, discount("percent", "")])[2]).toBe(0);
    // A discount is not a share of another discount.
    expect(totalOf([...base, discount("percent", "10"), discount("fixed", "5000")])).toBe(139004);
  });
  it("checks a line by what its kind needs", () => {
    expect(lineIsValid(course("A", "1", "0"))).toBe(true);
    expect(lineIsValid(course("A", "0", "5"))).toBe(false);
    expect(lineIsValid(course("A", "1001", "5"))).toBe(false);
    expect(lineIsValid(course("A", "1", ""))).toBe(false);
    expect(lineIsValid(newRow({ kind: "course", courseId: "", quantity: "1", unitPrice: "5" }))).toBe(false);
    expect(lineIsValid(other("Book", "5"))).toBe(true);
    expect(lineIsValid(other(" ", "5"))).toBe(false);
    expect(lineIsValid(other("Book", ""))).toBe(false);
    expect(lineIsValid(newRow())).toBe(false); // nothing chosen yet
    expect(lineIsValid(discount("percent", "100"))).toBe(true);
    expect(lineIsValid(discount("percent", "101"))).toBe(false);
    expect(lineIsValid(discount("percent", "0"))).toBe(false);
    expect(lineIsValid(discount("fixed", "5000"))).toBe(true);
    expect(lineIsValid(discount("fixed", ""))).toBe(false);
  });
  it("sends numbers, the course, the discount, and only the ids of lines that came from the server", () => {
    expect(
      linesPayload(
        [course(" A ", "2", "1.500", "l_1"), other("B", "5.000"), discount("percent", "10")],
        words,
      ),
    ).toEqual([
      { id: "l_1", description: "A", quantity: 2, unitPrice: 1500, courseId: "c_1" },
      { description: "B", quantity: 1, unitPrice: 5000 },
      {
        description: "Discount percent 10",
        quantity: 1,
        unitPrice: 0,
        discount: { type: "percent", value: 10 },
      },
    ]);
  });
  it("tells if the lines on screen are the saved ones", () => {
    const saved = [
      {
        id: "l_1",
        courseId: "c_1",
        description: "A",
        quantity: 2,
        unitPrice: 1500,
        amount: 3000,
        dates: [],
        discount: null,
      },
      {
        id: "l_2",
        courseId: null,
        description: "Book",
        quantity: 1,
        unitPrice: 500,
        amount: 500,
        dates: [],
        discount: null,
      },
      {
        id: "l_3",
        courseId: null,
        description: "Off",
        quantity: 1,
        unitPrice: -300,
        amount: -300,
        dates: [],
        discount: { type: "percent" as const, value: 10 },
      },
    ];
    const same = () => [
      course("A", "2", "1500", "l_1"),
      other("Book", "500", "l_2"),
      discount("percent", "10", "l_3"),
    ];
    expect(sameAsSaved(same(), saved)).toBe(true);
    for (const change of [
      (r: LineRow[]) => (r[0]!.quantity = "3"),
      (r: LineRow[]) => (r[0]!.unitPrice = "1600"),
      (r: LineRow[]) => (r[0]!.courseId = "c_2"),
      (r: LineRow[]) => (r[1]!.unitPrice = "600"),
      (r: LineRow[]) => (r[1]!.description = "Books"),
      (r: LineRow[]) => (r[2]!.discountValue = "20"),
      (r: LineRow[]) => (r[2]!.discountType = "fixed"),
      (r: LineRow[]) => r.pop(),
    ]) {
      const rows = same();
      change(rows);
      expect(sameAsSaved(rows, saved)).toBe(false);
    }
    expect(sameAsSaved([], saved)).toBe(false);
    expect(sameAsSaved([course("A", "2", "1500")], saved.slice(0, 1))).toBe(false); // a new line
  });
  it("shows an older line with a quantity as one amount, and does not call it a change", () => {
    const old = [
      {
        id: "l_1",
        courseId: null,
        description: "Books",
        quantity: 2,
        unitPrice: 30000,
        amount: 60000,
        dates: [],
        discount: null,
      },
    ];
    const rows = rowsOf(old);
    expect(rows[0]).toMatchObject({ kind: "other", unitPrice: "60000" });
    expect(sameAsSaved(rows, old)).toBe(true);
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
    discount: null,
  });
  it("tells the kind of each line, in the form and on the receipt", () => {
    const rows = rowsOf([line("c_1"), line(null)]);
    expect(rows.map((r) => r.kind)).toEqual(["course", "other"]);
    expect(rows[0]).toMatchObject({ courseId: "c_1", courseLocked: true });
    const inv = { lines: [line("c_1"), line(null)] } as unknown as Parameters<typeof sheetOf>[0];
    expect(sheetOf(inv).lines.map((l) => [l.perLesson, l.discount])).toEqual([
      [true, false],
      [false, false],
    ]);
  });
  it("reads a discount line", () => {
    const off = {
      ...line(null),
      discount: { type: "fixed" as const, value: 50000 },
      amount: -50000,
      unitPrice: -50000,
      quantity: 1,
    };
    expect(rowsOf([off])[0]).toMatchObject({
      kind: "discount",
      discountType: "fixed",
      discountValue: "50000",
    });
    const inv = { lines: [off] } as unknown as Parameters<typeof sheetOf>[0];
    expect(sheetOf(inv).lines[0]!.discount).toBe(true);
  });
});

describe("money as it is typed", () => {
  it("keeps the digits and drops the rest, and a minus sign only when it is allowed", () => {
    expect(cleanMoney("1.500 000abc")).toBe("1500000");
    expect(cleanMoney("-5.000")).toBe("5000");
    expect(cleanMoney("-5.000", true)).toBe("-5000");
    expect(cleanMoney("5-000", true)).toBe("5000");
  });
  it("writes a dot between the thousands", () => {
    expect(groupDigits("")).toBe("");
    expect(groupDigits("5")).toBe("5");
    expect(groupDigits("1000")).toBe("1.000");
    expect(groupDigits("1500000")).toBe("1.500.000");
    expect(groupDigits("123456")).toBe("123.456");
    expect(groupDigits("-50000")).toBe("-50.000");
    expect(groupDigits("007")).toBe("7");
    expect(parseMoney(groupDigits("1500000"))).toBe(1500000);
  });
  it("keeps the cursor after the same digit when the dots move", () => {
    expect(caretAfter("1.000", 1)).toBe(1);
    expect(caretAfter("1.000", 2)).toBe(3);
    expect(caretAfter("12.345", 3)).toBe(4);
    expect(caretAfter("12.345", 0)).toBe(0);
    expect(caretAfter("12.345", 9)).toBe(6);
  });
});
