import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_STATUSES,
  BILLABLE_ATTENDANCE,
  ERROR_CODES,
  GLOSSARY,
  PERMISSIONS,
  RESOURCES,
  ROLES,
  VN_BANKS,
  crc16,
  grantFor,
  isBin,
  paymentDetailsBody,
  transferMessage,
  vietQrPayload,
} from "./index";

describe("permission matrix", () => {
  it("has an entry for every resource and role", () => {
    for (const resource of RESOURCES) {
      for (const role of ROLES) expect(PERMISSIONS[resource][role]).toBeDefined();
    }
  });

  it("students can never write teacher-owned data", () => {
    const teacherOnly = [
      "course",
      "student",
      "enrollment",
      "lesson",
      "attendance",
      "material",
      "assignment",
      "invoice",
    ] as const;
    for (const resource of teacherOnly) {
      for (const action of ["create", "update", "delete", "publish", "grade", "send"] as const) {
        expect(grantFor(resource, "student", action), `${resource}.${action}`).toBeUndefined();
      }
    }
  });

  it("student access is always limited to their own or joined rows", () => {
    for (const resource of RESOURCES) {
      for (const scope of Object.values(PERMISSIONS[resource].student)) {
        expect(["own", "enrolled"]).toContain(scope);
      }
    }
  });

  it("teacher access is always inside their own tenant", () => {
    for (const resource of RESOURCES) {
      for (const scope of Object.values(PERMISSIONS[resource].teacher)) expect(scope).toBe("tenant");
    }
  });

  it("only teachers can score work and send invoices", () => {
    expect(grantFor("submission", "teacher", "grade")).toBe("tenant");
    expect(grantFor("submission", "student", "grade")).toBeUndefined();
    expect(grantFor("invoice", "teacher", "send")).toBe("tenant");
    expect(grantFor("invoice", "student", "send")).toBeUndefined();
  });

  it("students cannot read teacher's private notes through comments beyond their own", () => {
    expect(grantFor("comment", "student", "read")).toBe("own");
    expect(grantFor("comment", "student", "create")).toBeUndefined();
  });
});

describe("billing rule", () => {
  it("only attended lessons are billed", () => {
    expect(ATTENDANCE_STATUSES).toEqual(["attended", "absent"]);
    expect(BILLABLE_ATTENDANCE).toEqual(["attended"]);
  });
});

describe("error codes", () => {
  it("have a valid HTTP status and a plain message", () => {
    for (const [code, info] of Object.entries(ERROR_CODES)) {
      expect(info.status, code).toBeGreaterThanOrEqual(400);
      expect(info.status, code).toBeLessThan(600);
      expect(info.message.length, code).toBeGreaterThan(10);
      // Messages never show technical words to a teacher or student.
      expect(info.message, code).not.toMatch(/exception|stack|null|undefined|SQL|token|D1/i);
    }
  });
});

describe("glossary", () => {
  it("shows plain words to people, not school-system jargon", () => {
    const shown = Object.values(GLOSSARY).join(" ").toLowerCase();
    for (const jargon of ["enrollment", "submission", "assessment", "syllabus"]) {
      expect(shown, jargon).not.toContain(jargon);
    }
    expect(GLOSSARY.submission).toBe("Work turned in");
  });
});

describe("VietQR", () => {
  it("makes the standard CRC16 (the check value of '123456789' is 29B1)", () => {
    expect(crc16("123456789")).toBe("29B1");
    expect(crc16("")).toBe("FFFF");
  });

  it("writes the payload part by part, with the length of every part and the CRC at the end", () => {
    const text = vietQrPayload({
      bin: "970436",
      account: "0011001234567",
      amount: 450000,
      message: "INV-202609-0001",
    })!;
    expect(text).toBe(
      [
        "000201",
        "010212",
        "3857" + "0010A000000727" + "0127" + "0006970436" + "01130011001234567" + "0208QRIBFTTA",
        "5303704",
        "5406450000",
        "5802VN",
        "6219" + "0815INV-202609-0001",
        "6304",
      ].join("") + crc16(text.slice(0, -4)),
    );
    // The last 4 letters are the CRC of everything before them.
    expect(text.slice(-4)).toBe(crc16(text.slice(0, -4)));
  });

  it("has no message part when there is no message", () => {
    const text = vietQrPayload({ bin: "970415", account: "123456789", amount: 1000, message: "" })!;
    expect(text).not.toContain("62");
    expect(text.endsWith(crc16(text.slice(0, -4)))).toBe(true);
  });

  it("makes no code for a bank, account or amount that cannot work", () => {
    const ok = { bin: "970436", account: "0011001234567", amount: 1000, message: "x" };
    expect(vietQrPayload(ok)).not.toBeNull();
    for (const bad of [
      { bin: "97043" },
      { bin: "9704360" },
      { bin: "abcdef" },
      { bin: "" },
      { account: "12345" },
      { account: "12345678901234567890" },
      { account: "0011 0012" },
      { account: "" },
      { amount: 0 },
      { amount: -5 },
      { amount: 1.5 },
      { amount: 10_000_000_000_000 },
    ]) {
      expect(vietQrPayload({ ...ok, ...bad }), JSON.stringify(bad)).toBeNull();
    }
  });

  it("makes the words of a transfer safe: no accents, only allowed letters, at most 25", () => {
    expect(transferMessage("Học phí Đặng Thị Hoa")).toBe("Hoc phi Dang Thi Hoa");
    expect(transferMessage("INV-202609-0001 / Hoa <b>")).toBe("INV-202609-0001 Hoa b");
    expect(transferMessage("a".repeat(40))).toHaveLength(25);
    expect(transferMessage("  many   spaces  ")).toBe("many spaces");
    expect(transferMessage("🙂")).toBe("");
  });

  it("lists banks with 6 digit numbers that are all different", () => {
    expect(VN_BANKS.every((b) => isBin(b.bin) && b.name.length > 0)).toBe(true);
    expect(new Set(VN_BANKS.map((b) => b.bin)).size).toBe(VN_BANKS.length);
    expect(new Set(VN_BANKS.map((b) => b.name)).size).toBe(VN_BANKS.length);
    expect(VN_BANKS.find((b) => b.name === "Vietcombank")?.bin).toBe("970436");
  });

  it("only accepts a 6 digit bank number, or none, when payment details are saved", () => {
    expect(paymentDetailsBody.safeParse({ bankBin: "970436" }).success).toBe(true);
    expect(paymentDetailsBody.safeParse({ bankBin: "" }).success).toBe(true);
    expect(paymentDetailsBody.safeParse({}).data?.bankBin).toBe("");
    for (const bad of ["97043", "9704366", "abcdef", "970 436"]) {
      expect(paymentDetailsBody.safeParse({ bankBin: bad }).success, bad).toBe(false);
    }
  });
});
