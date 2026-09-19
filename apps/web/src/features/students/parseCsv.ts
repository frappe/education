export interface CsvStudent {
  name: string;
  email: string;
  phone?: string;
}

export interface CsvResult {
  rows: CsvStudent[];
  /** A problem with the whole file (not one row). */
  problem?: "empty" | "no_email_column";
}

/** Splits text into rows and cells. Handles "quoted, cells", doubled quotes and any line ending. */
function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}

const pickDelimiter = (firstLine: string): string => {
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  return counts.sort((a, b) => b[1] - a[1])[0]![1] > 0 ? counts[0]![0] : ",";
};

const NAME = /^(name|full ?name|student( name)?|họ tên|họ và tên|tên)$/i;
const EMAIL = /^(e-?mail|email address|mail)$/i;
const PHONE = /^(phone|mobile|tel|telephone|phone number|số điện thoại|sđt)$/i;

/**
 * Reads a student list from text (from a file or pasted from a sheet).
 * With a header row, columns can be in any order. Without one, the order is: name, email, phone.
 * Nothing is checked here beyond the shape. The server checks every row.
 */
export function parseStudentCsv(input: string): CsvResult {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r\n|\n|\r/).find((l) => l.trim() !== "") ?? "";
  const rows = splitCsv(text, pickDelimiter(firstLine));
  if (rows.length === 0) return { rows: [], problem: "empty" };

  const header = rows[0]!;
  const emailAt = header.findIndex((c) => EMAIL.test(c));
  const hasHeader = emailAt >= 0 || header.some((c) => NAME.test(c));

  if (hasHeader) {
    if (emailAt < 0) return { rows: [], problem: "no_email_column" };
    const nameAt = header.findIndex((c) => NAME.test(c));
    const phoneAt = header.findIndex((c) => PHONE.test(c));
    const body = rows.slice(1);
    if (body.length === 0) return { rows: [], problem: "empty" };
    return {
      rows: body.map((r) => ({
        name: nameAt >= 0 ? (r[nameAt] ?? "") : "",
        email: r[emailAt] ?? "",
        ...(phoneAt >= 0 && r[phoneAt] ? { phone: r[phoneAt] } : {}),
      })),
    };
  }

  return {
    rows: rows.map((r) => ({ name: r[0] ?? "", email: r[1] ?? "", ...(r[2] ? { phone: r[2] } : {}) })),
  };
}
