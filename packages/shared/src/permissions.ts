import type { Role } from "./domain";

/**
 * Single source of truth for who can do what (plan, Section 3.1).
 * The API policy layer reads this table and the authorization tests are
 * generated from it, so a route can never be added without a decision here.
 *
 * Scope meaning:
 *  - "tenant": the teacher, inside their own tenant only.
 *  - "own":    the student, only rows that belong to them.
 *  - "enrolled": the student, only for courses they joined.
 */
export type Action = "read" | "create" | "update" | "delete" | "publish" | "grade" | "send";
export type Scope = "tenant" | "own" | "enrolled";

export const RESOURCES = [
  "course",
  "student",
  "enrollment",
  "lesson",
  "attendance",
  "material",
  "assignment",
  "submission",
  "comment",
  "feedback",
  "invoice",
] as const;
export type Resource = (typeof RESOURCES)[number];

type Grant = Partial<Record<Action, Scope>>;
export type PermissionMatrix = Record<Resource, Record<Role, Grant>>;

const ALL_TENANT: Grant = {
  read: "tenant",
  create: "tenant",
  update: "tenant",
  delete: "tenant",
};

export const PERMISSIONS: PermissionMatrix = {
  course: {
    teacher: ALL_TENANT,
    student: { read: "enrolled" },
  },
  student: {
    teacher: ALL_TENANT,
    student: { read: "own" },
  },
  enrollment: {
    teacher: ALL_TENANT,
    student: { read: "own" },
  },
  lesson: {
    teacher: ALL_TENANT,
    student: { read: "enrolled" },
  },
  attendance: {
    teacher: { read: "tenant", create: "tenant", update: "tenant" },
    student: { read: "own" },
  },
  material: {
    teacher: ALL_TENANT,
    student: { read: "enrolled" },
  },
  assignment: {
    teacher: { ...ALL_TENANT, publish: "tenant" },
    student: { read: "enrolled" },
  },
  submission: {
    teacher: { read: "tenant", grade: "tenant", update: "tenant" },
    student: { read: "own", create: "own", update: "own" },
  },
  comment: {
    teacher: ALL_TENANT,
    student: { read: "own" },
  },
  feedback: {
    teacher: { read: "tenant" },
    student: { create: "own" },
  },
  invoice: {
    teacher: { ...ALL_TENANT, send: "tenant" },
    student: { read: "own" },
  },
};

export function grantFor(resource: Resource, role: Role, action: Action): Scope | undefined {
  return PERMISSIONS[resource][role][action];
}
