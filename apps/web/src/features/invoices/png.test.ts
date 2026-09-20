import { vietQrPayload } from "@lms/shared";
import { describe, expect, it } from "vitest";
import { qrModules, qrPath, qrTextOf, willHaveQr } from "./qr";
import type { SheetData } from "./sheet";

const receipt = (over: Partial<SheetData> = {}, payee: Partial<SheetData["payee"]> = {}): SheetData => ({
  number: "INV-202609-0001",
  status: "sent",
  teacherName: "Lan",
  studentName: "Hoa",
  period: "2026-09",
  lines: [],
  total: 450000,
  note: "",
  dueDate: null,
  sentAt: null,
  paidAt: null,
  payee: {
    payeeName: "Lan",
    payeePhone: "",
    bankName: "Vietcombank",
    bankBin: "970436",
    bankAccount: "0011001234567",
    bankHolder: "TRAN THI LAN",
    paymentNote: "",
    ...payee,
  },
  ...over,
});

describe("the payment QR on a receipt picture", () => {
  it("is made from the total, the bank and account of the teacher, and the number of the receipt", () => {
    expect(qrTextOf(receipt())).toBe(
      vietQrPayload({ bin: "970436", account: "0011001234567", amount: 450000, message: "INV-202609-0001" }),
    );
    expect(qrTextOf(receipt({ total: 100000 }))).toContain("5406100000");
  });

  it("is left out when the receipt is not waiting for payment, or has no number, or the bank details cannot make a code", () => {
    expect(qrTextOf(receipt({ status: "paid" }))).toBeNull();
    expect(qrTextOf(receipt({ status: "draft" }))).toBeNull();
    expect(qrTextOf(receipt({ status: "void" }))).toBeNull();
    expect(qrTextOf(receipt({ number: null }))).toBeNull();
    expect(qrTextOf(receipt({}, { bankBin: "" }))).toBeNull();
    expect(qrTextOf(receipt({}, { bankAccount: "" }))).toBeNull();
    expect(qrTextOf(receipt({}, { bankAccount: "0011 0012" }))).toBeNull();
    expect(qrTextOf(receipt({ total: 0 }))).toBeNull();
  });

  it("makes a square of dark and light squares", () => {
    const text = qrTextOf(receipt())!;
    const modules = qrModules(text);
    expect(modules.length).toBeGreaterThanOrEqual(21);
    expect(modules.every((row) => row.length === modules.length)).toBe(true);
    expect(modules.some((row) => row.some(Boolean))).toBe(true);
    expect(modules.some((row) => row.some((v) => !v))).toBe(true);
    // The three big squares in the corners are always dark at their edge.
    const n = modules.length;
    expect([modules[0]![0], modules[0]![n - 1], modules[n - 1]![0]]).toEqual([true, true, true]);
  });
});

describe("the payment QR on the screen", () => {
  it("draws one small square for each dark square of the code", () => {
    const modules = qrModules(qrTextOf(receipt())!);
    const dark = modules.flat().filter(Boolean).length;
    const path = qrPath(modules);
    expect(path.match(/M/g)).toHaveLength(dark);
    expect(
      qrPath([
        [true, false],
        [false, true],
      ]),
    ).toBe("M0 0h1v1h-1zM1 1h1v1h-1z");
  });

  it("tells the teacher on a draft that the code comes after sending, only when the bank details can make one", () => {
    expect(willHaveQr(receipt({ status: "draft", number: null }))).toBe(true);
    expect(willHaveQr(receipt({ status: "draft", number: null }, { bankBin: "" }))).toBe(false);
    expect(willHaveQr(receipt({ status: "draft", number: null, total: 0 }))).toBe(false);
    expect(willHaveQr(receipt({ status: "sent" }))).toBe(false);
    expect(willHaveQr(receipt({ status: "paid" }))).toBe(false);
  });
});
