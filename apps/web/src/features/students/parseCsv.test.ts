import { describe, expect, it } from "vitest";
import { parseStudentCsv } from "./parseCsv";
import { SAMPLE_STUDENT_CSV } from "./sample";

describe("parseStudentCsv", () => {
  it("reads rows without a header as name, email, phone", () => {
    expect(parseStudentCsv("Mai,mai@x.com,0901\nBao,bao@x.com").rows).toEqual([
      { name: "Mai", email: "mai@x.com", phone: "0901" },
      { name: "Bao", email: "bao@x.com" },
    ]);
  });

  it("uses a header row and any column order", () => {
    const res = parseStudentCsv("Email,Phone,Name\nmai@x.com,0901,Mai");
    expect(res.rows).toEqual([{ name: "Mai", email: "mai@x.com", phone: "0901" }]);
  });

  it("understands common header names, also Vietnamese ones", () => {
    expect(parseStudentCsv("Họ tên,Email,Số điện thoại\nMai,mai@x.com,0901").rows[0]).toEqual({
      name: "Mai",
      email: "mai@x.com",
      phone: "0901",
    });
    expect(parseStudentCsv("Full name;E-mail\nMai;mai@x.com").rows[0]).toEqual({
      name: "Mai",
      email: "mai@x.com",
    });
  });

  it("handles semicolons, tabs (pasted from a sheet), windows line ends, a BOM and blank lines", () => {
    expect(parseStudentCsv("﻿Mai;mai@x.com\r\n\r\nBao;bao@x.com\r\n").rows.length).toBe(2);
    expect(parseStudentCsv("Mai\tmai@x.com\tX\nBao\tbao@x.com").rows.length).toBe(2);
    expect(parseStudentCsv("a,b@x.com\rc,d@x.com").rows.length).toBe(2);
  });

  it("handles quoted cells with commas, quotes and new lines inside", () => {
    const res = parseStudentCsv('"Tran, Mai",mai@x.com\n"Say ""hi""",bao@x.com\n"Two\nlines",c@x.com');
    expect(res.rows.map((r) => r.name)).toEqual(["Tran, Mai", 'Say "hi"', "Two\nlines"]);
  });

  it("trims spaces and keeps text that looks like a formula as plain text", () => {
    expect(parseStudentCsv("  Mai  ,  mai@x.com ").rows[0]).toEqual({ name: "Mai", email: "mai@x.com" });
    expect(parseStudentCsv("=1+1,x@x.com").rows[0]!.name).toBe("=1+1");
  });

  it("reports an empty file, a header without rows, and a header without an email column", () => {
    expect(parseStudentCsv("").problem).toBe("empty");
    expect(parseStudentCsv("  \n \n").problem).toBe("empty");
    expect(parseStudentCsv("Name,Email").problem).toBe("empty");
    expect(parseStudentCsv("Name,Phone\nMai,0901").problem).toBe("no_email_column");
  });

  it("keeps rows with missing cells so the server can explain the problem", () => {
    expect(parseStudentCsv("Mai\n,x@x.com").rows).toEqual([
      { name: "Mai", email: "" },
      { name: "", email: "x@x.com" },
    ]);
  });
});

describe("the sample file", () => {
  it("is read by the import as two students, and its first row is the column names", () => {
    // The file that is saved starts with a byte order mark, as Excel likes it.
    const res = parseStudentCsv(`\uFEFF${SAMPLE_STUDENT_CSV}\r\n`);
    expect(res.problem).toBeUndefined();
    expect(res.rows).toEqual([
      { name: "Nguyen Van An", email: "an.nguyen@example.com", phone: "0901234567" },
      { name: "Tran Thi Binh", email: "binh.tran@example.com" },
    ]);
  });
});
