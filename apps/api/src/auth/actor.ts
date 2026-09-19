import { AppError } from "../lib/errors";
import type { Role } from "@lms/shared";

export interface Membership {
  tenantId: string;
  tenantName: string;
  role: Role;
}

/** Who is making the request. Built only from the server side session, never from client input. */
export interface Actor {
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  sessionId: string;
  memberships: Membership[];
}

export const teacherMembership = (actor: Actor): Membership | undefined =>
  actor.memberships.find((m) => m.role === "teacher");

/**
 * The tenant a teacher works in, taken from their session. Every teacher action starts here,
 * so the tenant never comes from anything the browser sent.
 */
export function requireTeacherTenant(actor: Actor): string {
  const m = teacherMembership(actor);
  if (!m) throw new AppError("FORBIDDEN");
  return m.tenantId;
}
