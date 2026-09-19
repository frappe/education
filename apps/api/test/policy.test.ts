import { PERMISSIONS, RESOURCES, ROLES, type Action } from "@lms/shared";
import { describe, expect, it } from "vitest";
import type { Actor } from "../src/auth/actor";
import { authorize, can } from "../src/policy";

const TENANT = "tenant-1";
const OTHER = "tenant-2";
const ME = "user-me";
const SOMEONE = "user-other";

const actorAs = (role: "teacher" | "student", tenantId = TENANT): Actor => ({
  userId: ME,
  name: "Me",
  email: "me@example.com",
  emailVerified: true,
  sessionId: "s",
  memberships: [{ tenantId, tenantName: "T", role }],
});

const ACTIONS: Action[] = ["read", "create", "update", "delete", "publish", "grade", "send"];

/**
 * These tests are built from the permission matrix in packages/shared, so changing the
 * matrix changes what is checked. A permission cannot exist that no test looks at.
 */
describe("policy follows the permission matrix", () => {
  for (const resource of RESOURCES) {
    for (const role of ROLES) {
      for (const action of ACTIONS) {
        const scope = PERMISSIONS[resource][role][action];
        const label = `${role} ${action} ${resource} (${scope ?? "not allowed"})`;
        it(label, () => {
          const actor = actorAs(role);
          const own = { tenantId: TENANT, ownerUserId: ME, courseStudentUserIds: [ME] };
          const notMine = { tenantId: TENANT, ownerUserId: SOMEONE, courseStudentUserIds: [SOMEONE] };
          const otherTenant = { tenantId: OTHER, ownerUserId: ME, courseStudentUserIds: [ME] };

          // Never allowed across tenants, whatever the scope.
          expect(can(actor, resource, action, otherTenant)).toBe(false);

          if (scope === undefined) {
            expect(can(actor, resource, action, own)).toBe(false);
            expect(can(actor, resource, action, notMine)).toBe(false);
          } else if (scope === "tenant") {
            expect(can(actor, resource, action, own)).toBe(true);
            expect(can(actor, resource, action, notMine)).toBe(true);
          } else {
            // "own" and "enrolled": only rows that belong to this person.
            expect(can(actor, resource, action, own)).toBe(true);
            expect(can(actor, resource, action, notMine)).toBe(false);
          }
        });
      }
    }
  }
});

describe("authorize", () => {
  it("answers NOT FOUND for a tenant the person does not belong to (hides that the row exists)", () => {
    expect(() => authorize(actorAs("teacher"), "student", "read", { tenantId: OTHER })).toThrow(
      /could not find/,
    );
  });

  it("answers FORBIDDEN inside their own tenant when the role is not allowed", () => {
    expect(() => authorize(actorAs("student"), "invoice", "send", { tenantId: TENANT })).toThrow(
      /permission/,
    );
  });

  it("allows what the matrix allows", () => {
    expect(() => authorize(actorAs("teacher"), "student", "create", { tenantId: TENANT })).not.toThrow();
  });

  it("uses the role the person has in THAT tenant", () => {
    const both: Actor = {
      ...actorAs("teacher"),
      memberships: [
        { tenantId: TENANT, tenantName: "A", role: "teacher" },
        { tenantId: OTHER, tenantName: "B", role: "student" },
      ],
    };
    expect(can(both, "course", "create", { tenantId: TENANT })).toBe(true);
    expect(can(both, "course", "create", { tenantId: OTHER })).toBe(false);
  });
});
