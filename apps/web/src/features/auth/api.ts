import type { SessionInfo, SignInBody, SignUpBody } from "@lms/shared";
import { api } from "@/api/client";

type Ok = { ok: true };
const post = <T = Ok>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} });

export const authApi = {
  signUp: (b: SignUpBody) => post("/auth/sign-up", b),
  resendVerification: (email: string, captcha?: string) =>
    post("/auth/verify-email/resend", { email, captcha }),
  verifyEmail: (token: string) => post("/auth/verify-email", { token }),
  signIn: (b: SignInBody) => post("/auth/sign-in", b),
  forgotPassword: (email: string, captcha?: string) => post("/auth/password/forgot", { email, captcha }),
  resetPassword: (token: string, password: string) => post("/auth/password/reset", { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    post("/auth/password/change", { currentPassword, newPassword }),
  requestMagicLink: (email: string, captcha?: string) => post("/auth/magic-link/request", { email, captcha }),
  consumeMagicLink: (token: string, trustDevice: boolean) =>
    post("/auth/magic-link/consume", { token, trustDevice }),
  acceptInvite: (token: string, trustDevice: boolean) => post("/invites/accept", { token, trustDevice }),
  sessions: () => api<{ sessions: SessionInfo[] }>("/auth/sessions"),
  endSession: (id: string) => api<Ok>(`/auth/sessions/${id}`, { method: "DELETE" }),
  signOutEverywhere: () => post("/auth/sign-out-everywhere"),
};
