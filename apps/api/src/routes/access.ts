/**
 * Who may call each route. Every route in the app MUST be listed here (a test checks this),
 * so nobody can add an open route by accident.
 *  - public:  anyone
 *  - user:    any signed in person
 *  - teacher: a signed in person with a teacher membership
 */
export type Access = "public" | "user" | "teacher";

export const ROUTE_ACCESS: Record<string, Access> = {
  "GET /api/health": "public",
  "GET /api/openapi.json": "public",
  "GET /api/dev/outbox": "public", // answers "not found" unless running locally
  "POST /api/auth/sign-up": "public",
  "POST /api/auth/verify-email": "public",
  "POST /api/auth/verify-email/resend": "public",
  "POST /api/auth/sign-in": "public",
  "POST /api/auth/password/forgot": "public",
  "POST /api/auth/password/reset": "public",
  "POST /api/auth/magic-link/request": "public",
  "POST /api/auth/magic-link/consume": "public",
  "POST /api/invites/accept": "public",
  "GET /api/me": "user",
  "POST /api/auth/sign-out": "user",
  "POST /api/auth/sign-out-everywhere": "user",
  "POST /api/auth/password/change": "user",
  "GET /api/auth/sessions": "user",
  "DELETE /api/auth/sessions/:id": "user",
  "GET /api/invites": "teacher",
  "POST /api/invites": "teacher",
  "POST /api/invites/:studentId/resend": "teacher",
  "DELETE /api/invites/:studentId": "teacher",
  "GET /api/courses": "teacher",
  "POST /api/courses": "teacher",
  "GET /api/courses/:id": "teacher",
  "PUT /api/courses/:id": "teacher",
  "POST /api/courses/:id/archive": "teacher",
  "POST /api/courses/:id/restore": "teacher",
  "GET /api/students": "teacher",
  "POST /api/students": "teacher",
  "POST /api/students/import": "teacher",
  "GET /api/students/:id": "teacher",
  "PUT /api/students/:id": "teacher",
  "POST /api/students/:id/archive": "teacher",
  "POST /api/students/:id/restore": "teacher",
  "GET /api/courses/:id/students": "teacher",
  "POST /api/courses/:id/students": "teacher",
  "PUT /api/courses/:id/students/:studentId": "teacher",
  "GET /api/students/:id/courses": "teacher",
};
