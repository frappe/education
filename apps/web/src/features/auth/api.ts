import type { SessionInfo, SignUpBody } from "@lms/shared";
import { api } from "@/api/client";

type Ok = { ok: true };
const post = <T = Ok>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} });

/** No passwords: everyone gets in with a link sent to their email. */
export const authApi = {
  signUp: (b: SignUpBody) => post("/auth/sign-up", b),
  verifyEmail: (token: string) => post("/auth/verify-email", { token }),
  requestSignInLink: (email: string, captcha?: string) =>
    post("/auth/sign-in-link/request", { email, captcha }),
  consumeSignInLink: (token: string, trustDevice: boolean) =>
    post("/auth/sign-in-link/consume", { token, trustDevice }),
  acceptInvite: (token: string, trustDevice: boolean) => post("/invites/accept", { token, trustDevice }),
  sessions: () => api<{ sessions: SessionInfo[] }>("/auth/sessions"),
  endSession: (id: string) => api<Ok>(`/auth/sessions/${id}`, { method: "DELETE" }),
  signOutEverywhere: () => post("/auth/sign-out-everywhere"),
};
