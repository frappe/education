import { ERROR_CODES } from "@lms/shared";
import { computed, ref } from "vue";
import { api } from "@/api/client";

export type GoogleIntent = "sign-in" | "sign-up" | "invite";

/**
 * The address that starts "Continue with Google". It is a normal page visit, not a fetch call:
 * the server sends the browser to Google and Google sends it back.
 */
export function googleStartUrl(o: { intent: GoogleIntent; invite?: string; keep?: boolean }): string {
  const q = new URLSearchParams({ intent: o.intent, keep: o.keep === false ? "0" : "1" });
  if (o.invite) q.set("invite", o.invite);
  return `/api/auth/google/start?${q}`;
}

/**
 * Text for a problem that came back in the address (`?error=CODE`) after the Google trip.
 * No `error` means no problem (null). A code we do not know gets the general message.
 */
export function errorFromAddress(code: unknown): string | null {
  if (code === undefined || code === null || code === "") return null;
  const known = typeof code === "string" && Object.hasOwn(ERROR_CODES, code);
  return ERROR_CODES[(known ? code : "INTERNAL") as keyof typeof ERROR_CODES].message;
}

interface SignInOptions {
  google: boolean;
  emailLink: boolean;
}
const options = ref<SignInOptions | null>(null);

/**
 * What ways to sign in this server has set up. Asked once. Until the answer comes, nothing is offered, so a form that
 * would not work is never shown.
 */
export function useSignInOptions() {
  if (options.value === null) {
    api<SignInOptions>("/auth/options")
      .then((r) => (options.value = { google: r.google, emailLink: r.emailLink }))
      .catch(() => (options.value = { google: false, emailLink: false }));
  }
  return {
    google: computed(() => options.value?.google === true),
    emailLink: computed(() => options.value?.emailLink === true),
    /** Answered, and there is no way to sign in. Something is not set up on the server. */
    none: computed(() => options.value !== null && !options.value.google && !options.value.emailLink),
  };
}

/** Whether Google sign in is set up on this server. */
export const useGoogleAvailable = () => useSignInOptions().google;

/** The code the local stand-in page hands back (only the local server accepts it). */
export function devGoogleCode(email: string, name: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ email, name }));
  const b64 = btoa(String.fromCharCode(...bytes));
  return `dev.${b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}
