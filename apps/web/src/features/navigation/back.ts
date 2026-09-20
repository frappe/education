import { ref, watch, type Ref } from "vue";
import { useRoute, useRouter, type Router } from "vue-router";

/** Screens that are not a good place to go "back" to: forms that were just filled in, and the screens for signing in. */
const NOT_A_PLACE =
  /\/(new|edit|import)(\/|\?|#|$)|^\/(sign-in|sign-up|accept-invite|magic-link|verify-email)/;

/** The path before this screen, when the person came from another screen of the app (not from outside or a new tab). */
export function previousPath(state: unknown): string | null {
  const back = (state as { back?: unknown } | null)?.back;
  return typeof back === "string" && back.startsWith("/") && !NOT_A_PLACE.test(back) ? back : null;
}

/** True when "back" goes to the screen the person came from (and not to a fixed screen). */
export const cameFromApp = (): boolean => previousPath(window.history.state) !== null;

/** Back goes to the screen the person came from. If there is none (a new tab, a link), it goes to `fallback`. */
export function goBack(router: Router, fallback: string): void {
  if (cameFromApp()) router.back();
  else void router.push(fallback);
}

/**
 * A text that lives in the address (`?week=2026-09-14`), so that going back to the screen shows it as it was left.
 * It replaces the address, so it does not add steps to the history.
 */
export function useQueryRef(
  key: string,
  fallback: string,
  valid: (v: string) => boolean = () => true,
): Ref<string> {
  const route = useRoute();
  const router = useRouter();
  const found = route.query[key];
  const value = ref(typeof found === "string" && found !== "" && valid(found) ? found : fallback);
  watch(value, (v) => {
    const query = { ...route.query };
    if (v === fallback || v === "") delete query[key];
    else query[key] = v;
    void router.replace({ query });
  });
  return value;
}
