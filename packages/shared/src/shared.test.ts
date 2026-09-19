import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_STATUSES,
  BILLABLE_ATTENDANCE,
  ERROR_CODES,
  GLOSSARY,
  PERMISSIONS,
  RESOURCES,
  ROLES,
  grantFor,
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
