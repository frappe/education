import { z } from "zod";
import { LIMITS } from "./domain";

/**
 * Request shapes shared by the API (which checks them) and the web app (which uses the
 * types and can check early). One definition means both sides always agree.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "This email is too long.")
  .pipe(z.email("Please enter a valid email address."));

const name = z.string().trim().min(1, "Please enter a name.").max(100, "This name is too long.");

/** Long passwords are fine, very long ones are refused so nobody can make us hash huge input. */
export const password = z
  .string()
  .min(LIMITS.minPasswordLength, `Use at least ${LIMITS.minPasswordLength} characters.`)
  .max(128, "This password is too long.");

/** Sent by the bot check widget. Empty is allowed here; the server decides if it is required. */
const captcha = z.string().max(4096).optional();

export const signUpBody = z.object({ name, email, password, captcha });
export const signInBody = z.object({
  email,
  password: z.string().min(1, "Please enter your password.").max(128),
  captcha,
});
export const tokenBody = z.object({ token: z.string().min(20).max(200) });
export const consumeLinkBody = tokenBody.extend({ trustDevice: z.boolean().optional() });
export const emailOnlyBody = z.object({ email, captcha });
export const resetPasswordBody = tokenBody.extend({ password });
export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "Please enter your current password.").max(128),
  newPassword: password,
});
export const inviteStudentBody = z.object({ name, email });

export type SignUpBody = z.infer<typeof signUpBody>;
export type SignInBody = z.infer<typeof signInBody>;
export type InviteStudentBody = z.infer<typeof inviteStudentBody>;

export interface MeResponse {
  user: { id: string; name: string; email: string; emailVerified: boolean };
  memberships: { tenantId: string; tenantName: string; role: "teacher" | "student" }[];
}

export interface SessionInfo {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  current: boolean;
}

export type InviteState = "sent" | "expired" | "revoked";
export interface InviteInfo {
  studentId: string;
  name: string;
  email: string;
  state: InviteState;
  sentAt: string | null;
}
