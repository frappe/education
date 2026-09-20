import { LIMITS } from "@lms/shared";
import { computed, ref, toValue, watch, type MaybeRefOrGetter, type WatchSource } from "vue";

/** How many rows a table or list shows on one page. */
export const PAGE_SIZE = LIMITS.pageSize;

/** The rows of one page (pages start at 1). A page that does not exist is empty. */
export function pageOf<T>(items: readonly T[], page: number, size: number = PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

/** How many pages `count` rows make. There is always at least one. */
export const pageCount = (count: number, size: number = PAGE_SIZE): number =>
  Math.max(1, Math.ceil(count / size));

/**
 * Pages for a list that is already in the browser. `shown` is the current page. When the list gets shorter
 * (a row was deleted, a filter was used) the page moves back to the last one that exists. `resetOn` sends the person
 * back to page 1 when it changes (for example the text of a search).
 */
export function usePaging<T>(
  items: MaybeRefOrGetter<readonly T[]>,
  options: { size?: number; resetOn?: WatchSource } = {},
) {
  const size = options.size ?? PAGE_SIZE;
  const page = ref(1);
  const total = computed(() => toValue(items).length);
  const pages = computed(() => pageCount(total.value, size));
  const shown = computed(() => pageOf(toValue(items), page.value, size));
  watch(pages, (n) => {
    if (page.value > n) page.value = n;
  });
  if (options.resetOn) watch(options.resetOn, () => (page.value = 1));
  return { page, pages, total, shown };
}
