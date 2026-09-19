import { ref } from "vue";
import { ApiError } from "@/api/client";

/**
 * For pages opened from an email link. They show one button, and the link is only used
 * when the person presses it (so a mail scanner that opens the link cannot use it up).
 */
export function useOneClick(action: () => Promise<void>) {
  const busy = ref(false);
  const expired = ref(false);
  const error = ref<string | null>(null);

  async function run() {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      await action();
    } catch (err) {
      if (err instanceof ApiError && err.code === "LINK_EXPIRED") expired.value = true;
      else error.value = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
    } finally {
      busy.value = false;
    }
  }

  return { busy, expired, error, run };
}
