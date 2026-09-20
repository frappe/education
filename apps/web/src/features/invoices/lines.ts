import type { InvoiceDiscount, InvoiceLine, UpdateInvoiceBody } from "@lms/shared";

/** What a row is for. "" is a new row where the teacher has not chosen yet. */
export type LineKind = "" | "course" | "other" | "discount";

/** A line in the form: what the teacher typed, as text. */
export interface LineRow {
  /** Only for the list on screen. */
  key: number;
  /** The id of a line that came from the server. */
  id?: string;
  kind: LineKind;
  /** A course line: the course. It cannot be changed once the line is saved. */
  courseId: string;
  /** A course line: the name of the course. An other-cost line: what it is. */
  description: string;
  /** A course line: the number of lessons. Other cost and discount: 1. */
  quantity: string;
  /** A course line: the price of one lesson. Other cost: the amount. */
  unitPrice: string;
  /** A discount: a percentage or a fixed amount, and the number typed for it. */
  discountType: InvoiceDiscount["type"];
  discountValue: string;
  /** The line was saved with a course: the course stays. */
  courseLocked: boolean;
}

/**
 * Reads a whole number of VND from what was typed. Spaces, dots and commas between digits are
 * thousands separators ("100.000", "100,000", "100 000"). A minus sign at the start is allowed.
 * Anything else is NaN.
 */
export function parseMoney(text: string): number {
  const t = text.replace(/[\s.,]/g, "");
  return /^-?\d+$/.test(t) ? Number(t) : Number.NaN;
}

let nextKey = 1;
export const newRow = (over: Partial<LineRow> = {}): LineRow => ({
  key: nextKey++,
  kind: "",
  courseId: "",
  description: "",
  quantity: "1",
  unitPrice: "",
  discountType: "percent",
  discountValue: "",
  courseLocked: false,
  ...over,
});

export const rowsOf = (lines: InvoiceLine[]): LineRow[] =>
  lines.map((l) =>
    l.discount
      ? newRow({
          id: l.id,
          kind: "discount",
          description: l.description,
          discountType: l.discount.type,
          discountValue: String(l.discount.value),
        })
      : l.courseId !== null
        ? newRow({
            id: l.id,
            kind: "course",
            courseId: l.courseId,
            description: l.description,
            quantity: String(l.quantity),
            unitPrice: String(l.unitPrice),
            courseLocked: true,
          })
        : newRow({
            id: l.id,
            kind: "other",
            description: l.description,
            // An other-cost line is one amount. An older line with a quantity is shown as its amount.
            unitPrice: String(l.quantity * l.unitPrice),
          }),
  );

const discountOf = (row: LineRow): InvoiceDiscount | null => {
  const value = parseMoney(row.discountValue);
  return Number.isFinite(value) ? { type: row.discountType, value } : null;
};

/** The amount of each row, or 0 while a row is not filled in correctly. A discount is a share of the rows above it. */
export function amountsOf(rows: LineRow[]): number[] {
  const own = rows.map((r) => {
    if (r.kind === "course") {
      const q = parseMoney(r.quantity);
      const p = parseMoney(r.unitPrice);
      return Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
    }
    if (r.kind === "other") {
      const p = parseMoney(r.unitPrice);
      return Number.isFinite(p) ? p : 0;
    }
    return 0;
  });
  const base = own.reduce((sum, a) => sum + a, 0);
  return rows.map((r, i) => {
    if (r.kind !== "discount") return own[i]!;
    const d = discountOf(r);
    if (!d) return 0;
    // The same rounding as the server, so the screen and the saved receipt show the same amount.
    return -(d.type === "percent" ? Math.round((base * d.value) / 100) : d.value);
  });
}

export const amountOf = (row: LineRow, rows: LineRow[] = [row]): number =>
  amountsOf(rows)[rows.indexOf(row)] ?? 0;

export const totalOf = (rows: LineRow[]): number => amountsOf(rows).reduce((sum, a) => sum + a, 0);

/** A row is right when everything that its kind needs is filled in. */
export function lineIsValid(row: LineRow): boolean {
  if (row.kind === "course") {
    const q = parseMoney(row.quantity);
    return row.courseId !== "" && q >= 1 && q <= 1000 && Number.isFinite(parseMoney(row.unitPrice));
  }
  if (row.kind === "other") {
    return row.description.trim() !== "" && Number.isFinite(parseMoney(row.unitPrice));
  }
  if (row.kind === "discount") {
    const d = discountOf(row);
    return d !== null && d.value >= 1 && (d.type === "fixed" || d.value <= 100);
  }
  return false;
}

/** What is sent to the server. Amounts and totals are worked out there. `discountText` words a discount line. */
export const linesPayload = (
  rows: LineRow[],
  discountText: (d: InvoiceDiscount) => string,
): UpdateInvoiceBody["lines"] =>
  rows.map((r) => {
    const id = r.id ? { id: r.id } : {};
    if (r.kind === "discount") {
      const d = discountOf(r)!;
      return { ...id, description: discountText(d), quantity: 1, unitPrice: 0, discount: d };
    }
    if (r.kind === "course") {
      return {
        ...id,
        description: r.description.trim(),
        quantity: parseMoney(r.quantity),
        unitPrice: parseMoney(r.unitPrice),
        courseId: r.courseId,
      };
    }
    return { ...id, description: r.description.trim(), quantity: 1, unitPrice: parseMoney(r.unitPrice) };
  });

/** True when the lines on screen are the same as the lines that were saved. */
export function sameAsSaved(rows: LineRow[], saved: InvoiceLine[]): boolean {
  if (rows.length !== saved.length) return false;
  return rows.every((r, i) => {
    const s = saved[i]!;
    if (r.id !== s.id) return false;
    if (r.kind === "discount") {
      return (
        s.discount !== null &&
        s.discount.type === r.discountType &&
        s.discount.value === parseMoney(r.discountValue)
      );
    }
    if (s.discount !== null) return false;
    if (r.kind === "course") {
      return (
        s.courseId === r.courseId &&
        r.description.trim() === s.description &&
        parseMoney(r.quantity) === s.quantity &&
        parseMoney(r.unitPrice) === s.unitPrice
      );
    }
    return (
      s.courseId === null &&
      r.description.trim() === s.description &&
      parseMoney(r.unitPrice) === s.quantity * s.unitPrice
    );
  });
}
