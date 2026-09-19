import type { EmailKind, NotificationItem, NotificationList, NotificationSettings } from "@lms/shared";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";
import { messageOf } from "@/features/errors";

/** How many notifications the person has not read. One copy for the whole app (the menu and the page use it). */
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

/** The notifications page: the list, marking as read, and the choices for email. Logic only. */
export function useNotificationList() {
  const items = ref<NotificationItem[]>([]);
  const settings = ref<NotificationSettings>({ kinds: [] });
  const loading = ref(true);
  const error = ref<string | null>(null);
  const savingKind = ref<EmailKind | null>(null);

  onMounted(async () => {
    try {
      const [list, s] = await Promise.all([
        api<NotificationList>("/notifications"),
        api<{ settings: NotificationSettings }>("/notifications/settings"),
      ]);
      items.value = list.items;
      unread.value = list.unread;
      settings.value = s.settings;
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });

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
  const readAll = () => read();

  /** Turns one kind of email on or off. The screen shows the new choice at once and goes back if it fails. */
  async function setEmail(kind: EmailKind, on: boolean) {
    const before = settings.value;
    settings.value = { kinds: before.kinds.map((k) => (k.kind === kind ? { ...k, email: on } : k)) };
    savingKind.value = kind;
    try {
      const muted = settings.value.kinds.filter((k) => !k.email).map((k) => k.kind);
      settings.value = (
        await api<{ settings: NotificationSettings }>("/notifications/settings", {
          method: "PUT",
          body: { muted },
        })
      ).settings;
    } catch (err) {
      settings.value = before;
      error.value = messageOf(err);
    } finally {
      savingKind.value = null;
    }
  }

  const hasUnread = computed(() => items.value.some((i) => !i.read));
  return { items, settings, loading, error, savingKind, hasUnread, read, readAll, setEmail };
}
