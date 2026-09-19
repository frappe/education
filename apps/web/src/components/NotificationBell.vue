<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatWhen } from "@/features/format";
import { useNotificationList, useUnread } from "@/features/notifications/useNotifications";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";

// The bell in the top bar. It opens a small panel with the latest notifications.
const t = messages.notifications;
const router = useRouter();
const route = useRoute();
const unread = useUnread();
const list = useNotificationList();
const open = ref(false);
const root = ref<HTMLElement>();
const button = ref<HTMLButtonElement>();

async function toggle() {
  open.value = !open.value;
  if (open.value) await list.load();
}
function close(returnFocus = false) {
  open.value = false;
  if (returnFocus) button.value?.focus();
}
/** Opening a notification marks it as read, closes the panel and goes to the place it is about. */
async function go(item: { id: string; link: string; read: boolean }) {
  close();
  if (!item.read) void list.read([item.id]);
  if (item.link) await router.push(item.link);
}

// A click outside, or the Escape key, closes the panel.
const onPointer = (e: MouseEvent) => open.value && !root.value?.contains(e.target as Node) && close();
const onKey = (e: KeyboardEvent) => e.key === "Escape" && open.value && close(true);
onMounted(() => {
  document.addEventListener("mousedown", onPointer);
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onPointer);
  document.removeEventListener("keydown", onKey);
});
watch(
  () => route.fullPath,
  () => close(),
);
</script>

<template>
  <div ref="root" class="relative">
    <button
      ref="button"
      type="button"
      class="btn btn-ghost btn-circle"
      :aria-label="unread ? fill(t.bellUnread, { n: unread }) : t.title"
      aria-haspopup="dialog"
      :aria-expanded="open"
      aria-controls="notification-panel"
      @click="toggle"
    >
      <span class="indicator">
        <span
          v-if="unread"
          class="badge badge-primary badge-xs indicator-item min-w-4 px-1"
          aria-hidden="true"
          >{{ unread > 9 ? "9+" : unread }}</span
        >
        <AppIcon name="bell" :size="22" />
      </span>
    </button>

    <div
      v-if="open"
      id="notification-panel"
      role="dialog"
      :aria-label="t.title"
      class="absolute right-0 top-full z-40 mt-2 flex max-h-[32rem] w-96 max-w-[calc(100vw-1.5rem)] flex-col rounded-box border border-base-300 bg-base-100 shadow-lg"
    >
      <div class="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
        <h2 class="font-semibold">{{ t.title }}</h2>
        <AppButton variant="ghost" compact :disabled="!list.hasUnread.value" @click="list.readAll">{{
          t.readAll
        }}</AppButton>
      </div>
      <AppAlert v-if="list.error.value" kind="error">{{ list.error.value }}</AppAlert>
      <AppLoading v-if="list.loading.value" :label="messages.common.loading" />
      <p v-else-if="list.items.value.length === 0" class="px-4 py-8 text-center text-sm text-base-content/60">
        {{ t.none }}
      </p>
      <ul v-else class="divide-y divide-base-300 overflow-y-auto">
        <li v-for="i in list.items.value" :key="i.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-base-200/60"
            @click="go(i)"
          >
            <span
              class="mt-1.5 size-2.5 shrink-0 rounded-full"
              :class="i.read ? 'bg-transparent' : 'bg-primary'"
              :role="i.read ? undefined : 'img'"
              :aria-label="i.read ? undefined : t.unread"
            />
            <span class="min-w-0 flex-1">
              <span class="block text-sm" :class="i.read ? '' : 'font-semibold'">{{ i.title }}</span>
              <span v-if="i.body" class="block truncate text-xs text-base-content/60">{{ i.body }}</span>
              <span class="block text-xs text-base-content/50">{{ formatWhen(i.at) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
