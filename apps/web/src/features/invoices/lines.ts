import type { InvoiceLine, UpdateInvoiceBody } from "@lms/shared";

/** A line in the form: what the teacher typed, as text. */
export interface LineRow {
  /** Only for the list on screen. */
  key: number;
  /** The id of a line that came from the server. */
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

/**
 * Reads a whole number of VND from what was typed. Spaces, dots and commas between digits are
 * thousands separators ("100.000", "100,000", "100 000"). A minus sign at the start is allowed (a discount).
 * Anything else is NaN.
 */
export function parseMoney(text: string): number {
  const t = text.replace(/[\s.,]/g, "");
  return /^-?\d+$/.test(t) ? Number(t) : Number.NaN;
}

let nextKey = 1;
export const newRow = (over: Partial<LineRow> = {}): LineRow => ({
  key: nextKey++,
  description: "",
  quantity: "1",
  unitPrice: "",
  ...over,
});

export const rowsOf = (lines: InvoiceLine[]): LineRow[] =>
  lines.map((l) =>
    newRow({
      id: l.id,
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
    }),
  );

/** The amount of a line, or 0 while it is not filled in correctly. */
export function amountOf(row: LineRow): number {
  const q = parseMoney(row.quantity);
  const p = parseMoney(row.unitPrice);
  return Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
}

export const totalOf = (rows: LineRow[]): number => rows.reduce((sum, r) => sum + amountOf(r), 0);

/** A line is right when it has a description, a quantity of 1 or more, and a price. */
export function lineIsValid(row: LineRow): boolean {
  const q = parseMoney(row.quantity);
  return row.description.trim() !== "" && q >= 1 && q <= 1000 && Number.isFinite(parseMoney(row.unitPrice));
}

/** What is sent to the server. Amounts and totals are worked out there. */
export const linesPayload = (rows: LineRow[]): UpdateInvoiceBody["lines"] =>
  rows.map((r) => ({
    ...(r.id ? { id: r.id } : {}),
    description: r.description.trim(),
    quantity: parseMoney(r.quantity),
    unitPrice: parseMoney(r.unitPrice),
  }));

/** True when the lines on screen are different from the lines that were saved. */
export function sameAsSaved(rows: LineRow[], saved: InvoiceLine[]): boolean {
  if (rows.length !== saved.length) return false;
  return rows.every((r, i) => {
    const s = saved[i]!;
    return (
      r.id === s.id &&
      r.description.trim() === s.description &&
      parseMoney(r.quantity) === s.quantity &&
      parseMoney(r.unitPrice) === s.unitPrice
    );
  });
}
