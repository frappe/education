import type { MeResponse } from "@lms/shared";

export interface RouteRules {
  /** Only for signed in people. */
  requiresAuth?: boolean;
  /** Only for teachers. */
  requiresTeacher?: boolean;
  /** Sign in / sign up pages: a signed in person is sent home. */
  guestOnly?: boolean;
}

/** Decides where a person may go. Pure function, so it is easy to test. */
export function decideRoute(rules: RouteRules, me: MeResponse | null, fullPath: string): "ok" | string {
  if (rules.guestOnly && me) return "/";
  if ((rules.requiresAuth || rules.requiresTeacher) && !me) {
    return `/sign-in?next=${encodeURIComponent(fullPath)}`;
  }
  if (rules.requiresTeacher && !me?.memberships.some((m) => m.role === "teacher")) return "/";
  return "ok";
}

/** Only allow a return address inside this site. Anything else could send someone to a fake page. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}
