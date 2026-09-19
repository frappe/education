import { PERMISSIONS, type Action, type Resource, type Scope } from "@lms/shared";
import type { Actor } from "./auth/actor";
import { AppError } from "./lib/errors";

/** The row the actor wants to touch. Filled in by the repository that loaded it. */
export interface Target {
  tenantId: string;
  /** The person the row belongs to (for "own" access). */
  ownerUserId?: string;
  /** People who joined the course the row belongs to (for "enrolled" access). */
  courseStudentUserIds?: readonly string[];
}

function scopeAllows(scope: Scope, actor: Actor, target: Target, tenantId: string): boolean {
  switch (scope) {
    case "tenant":
      return target.tenantId === tenantId;
    case "own":
      return target.tenantId === tenantId && target.ownerUserId === actor.userId;
    case "enrolled":
      return target.tenantId === tenantId && (target.courseStudentUserIds?.includes(actor.userId) ?? false);
  }
}

/** True if the permission matrix in packages/shared lets this actor do this to this row. */
export function can(actor: Actor, resource: Resource, action: Action, target: Target): boolean {
  return actor.memberships.some((m) => {
    if (m.tenantId !== target.tenantId) return false;
    const scope = PERMISSIONS[resource][m.role][action];
    return scope !== undefined && scopeAllows(scope, actor, target, m.tenantId);
  });
}

/**
 * Throws if not allowed. A row in a tenant the actor does not belong to answers
 * "not found", so nobody can learn that another teacher's row exists.
 */
export function authorize(actor: Actor, resource: Resource, action: Action, target: Target): void {
  if (!actor.memberships.some((m) => m.tenantId === target.tenantId)) throw new AppError("NOT_FOUND");
  if (!can(actor, resource, action, target)) throw new AppError("FORBIDDEN");
}
