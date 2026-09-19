<script setup lang="ts">
import { useRouter } from "vue-router";
import { formatWhen } from "@/features/format";
import { useNotificationList } from "@/features/notifications/useNotifications";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.notifications;
const router = useRouter();
const n = useNotificationList();
const emailText = {
  homework_new: t.kindNew,
  homework_due: t.kindDue,
  homework_returned: t.kindReturned,
  homework_again: t.kindAgain,
} as const;

/** Opening a notification marks it as read and goes to the place it is about. */
async function open(item: { id: string; link: string; read: boolean }) {
  if (!item.read) await n.read([item.id]);
  if (item.link) await router.push(item.link);
}
</script>

<template>
  <AppPage :title="t.title" :subtitle="t.subtitle">
    <template #actions>
      <AppButton variant="secondary" compact :disabled="!n.hasUnread.value" @click="n.readAll">{{
        t.readAll
      }}</AppButton>
    </template>

    <AppAlert v-if="n.error.value" kind="error">{{ n.error.value }}</AppAlert>
    <AppLoading v-if="n.loading.value" :label="messages.common.loading" />
    <template v-else>
      <div v-if="n.items.value.length === 0" class="rounded-box border border-base-300 bg-base-100">
        <AppEmpty icon="info" :title="t.none" :text="t.noneText" />
      </div>
      <AppCard v-else flush>
        <ul class="divide-y divide-base-300">
          <li v-for="i in n.items.value" :key="i.id">
            <button
              type="button"
              class="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-base-200/60"
              @click="open(i)"
            >
              <span
                class="mt-2 size-2.5 shrink-0 rounded-full"
                :class="i.read ? 'bg-transparent' : 'bg-primary'"
                :aria-label="i.read ? undefined : t.unread"
                :role="i.read ? undefined : 'img'"
              />
              <span class="min-w-0 flex-1">
                <span class="block" :class="i.read ? '' : 'font-semibold'">{{ i.title }}</span>
                <span v-if="i.body" class="block truncate text-sm text-base-content/60">{{ i.body }}</span>
              </span>
              <span class="whitespace-nowrap text-sm text-base-content/60">{{ formatWhen(i.at) }}</span>
            </button>
          </li>
        </ul>
      </AppCard>

      <AppCard v-if="n.settings.value.kinds.length > 0" :title="t.emailTitle" :description="t.emailText">
        <ul class="flex flex-col gap-1">
          <li
            v-for="k in n.settings.value.kinds"
            :key="k.kind"
            class="flex min-h-11 items-center justify-between gap-3"
          >
            <label :for="`mail-${k.kind}`" class="flex-1 cursor-pointer">{{ emailText[k.kind] }}</label>
            <input
              :id="`mail-${k.kind}`"
              type="checkbox"
              class="toggle toggle-primary"
              :checked="k.email"
              :disabled="n.savingKind.value === k.kind"
              @change="n.setEmail(k.kind, ($event.target as HTMLInputElement).checked)"
            />
          </li>
        </ul>
        <p class="text-sm text-base-content/60">{{ t.emailNote }}</p>
      </AppCard>
    </template>
  </AppPage>
</template>
