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
