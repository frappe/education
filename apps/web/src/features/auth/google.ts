import { ERROR_CODES } from "@lms/shared";
import { ref } from "vue";
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

const available = ref<boolean | null>(null);

/** Whether Google sign in is set up on this server. Asked once, so the buttons are hidden when it is off. */
export function useGoogleAvailable() {
  if (available.value === null) {
    available.value = false;
    api<{ google: boolean }>("/auth/options")
      .then((r) => (available.value = r.google))
      .catch(() => (available.value = false));
  }
  return available;
}

/** The code the local stand-in page hands back (only the local server accepts it). */
export function devGoogleCode(email: string, name: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ email, name }));
  const b64 = btoa(String.fromCharCode(...bytes));
  return `dev.${b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}
