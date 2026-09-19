import type { NotificationItem, NotificationList } from "@lms/shared";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";
import { messageOf } from "@/features/errors";

/** How many notifications the person has not read. One copy for the whole app (the bell and the list use it). */
const unread = ref(0);
export const useUnread = () => unread;

const POLL_MS = 60_000;

/**
 * Keeps the unread count fresh: every minute while the page is open, and when the person comes back to the tab.
 * (Plan 3.4: polling is enough for now.) A failed check is ignored; the next one tries again.
 */
export function useUnreadPolling(signedIn: () => boolean) {
  let timer: ReturnType<typeof setInterval> | undefined;
  async function check() {
    if (!signedIn()) {
      unread.value = 0;
      return;
    }
    try {
      unread.value = (await api<{ unread: number }>("/notifications/unread")).unread;
    } catch {
      /* try again next time */
    }
  }
  const onVisible = () => document.visibilityState === "visible" && void check();
  watch(signedIn, () => void check());
  onMounted(() => {
    void check();
    timer = setInterval(() => document.visibilityState === "visible" && void check(), POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
  });
  onBeforeUnmount(() => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  });
}

/** The list in the bell: loading it when it opens, and marking as read. Logic only. */
export function useNotificationList() {
  const items = ref<NotificationItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = items.value.length === 0; // no spinner when there is something to show already
    error.value = null;
    try {
      const list = await api<NotificationList>("/notifications");
      items.value = list.items;
      unread.value = list.unread;
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  }

  async function read(ids?: string[]) {
    try {
      unread.value = (
        await api<{ unread: number }>("/notifications/read", { method: "POST", body: ids ? { ids } : {} })
      ).unread;
      const now = new Set(ids ?? items.value.map((i) => i.id));
      items.value = items.value.map((i) => (now.has(i.id) ? { ...i, read: true } : i));
    } catch (err) {
      error.value = messageOf(err);
    }
  }

  const hasUnread = computed(() => items.value.some((i) => !i.read));
  return { items, loading, error, hasUnread, load, read, readAll: () => read() };
}
