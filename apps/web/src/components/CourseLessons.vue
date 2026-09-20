<script setup lang="ts">
import { lessonLabel } from "@/features/lessons/status";
import type { LessonInfo } from "@lms/shared";
import { computed, ref } from "vue";
import LessonFields from "@/components/LessonFields.vue";
import { useCourseLessons } from "@/features/lessons/useLessons";
import { usePaging } from "@/features/paging";
import { formatDayShort } from "@/features/format";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppModal from "@/ui/AppModal.vue";
import AppPager from "@/ui/AppPager.vue";
import { useRouter } from "vue-router";

const props = defineProps<{ courseId: string }>();
const t = messages.lessons;
const router = useRouter();

const { loading, error, form, cancel, restore, parts } = useCourseLessons(props.courseId, {
  added: (n) => (n === 1 ? t.addedOne : fill(t.added, { n })),
});

// Ten lessons a page, in the lessons to come and in the earlier ones (each has its own pages).
const upcomingPaging = usePaging(() => parts.value.upcoming);
const pastPaging = usePaging(() => parts.value.past);
const groups = computed(() => [
  { key: "upcoming", title: t.upcoming, paging: upcomingPaging },
  { key: "past", title: t.past, paging: pastPaging },
]);

const cancelledText = (n: number) => (n === 1 ? t.cancelled : fill(t.cancelledMany, { n }));
const statusText = {
  scheduled: t.statusScheduled,
  held: t.statusHeld,
  cancelled: t.statusCancelled,
  needs_attendance: t.statusNeeds,
} as const;
const statusTone = {
  scheduled: "info",
  held: "success",
  cancelled: "neutral",
  needs_attendance: "warning",
} as const;

// A lesson in a weekly series asks what to cancel; a single lesson is cancelled at once.
const asking = ref<LessonInfo | null>(null);
function askCancel(l: LessonInfo) {
  if (l.seriesId) asking.value = l;
  else void cancel(l.id, "this", cancelledText);
}
async function doCancel(scope: "this" | "following") {
  const l = asking.value;
  asking.value = null;
  if (l) await cancel(l.id, scope, cancelledText);
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppCard :title="t.addTitle" :description="t.addText">
      <form class="grid gap-x-4 gap-y-3 md:grid-cols-2" novalidate @submit.prevent="form.submit">
        <AppAlert v-if="form.formError.value" kind="error" class="md:col-span-2">{{
          form.formError.value
        }}</AppAlert>
        <LessonFields :values="form.values" :errors="form.errors.value" />
        <div class="md:col-span-2">
          <AppButton type="submit" :loading="form.submitting.value"
            ><AppIcon name="calendar-plus" :size="18" />{{ t.add }}</AppButton
          >
        </div>
      </form>
    </AppCard>

    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppLoading v-if="loading" :label="messages.common.loading" />
    <AppCard v-else-if="upcomingPaging.total.value === 0 && pastPaging.total.value === 0">
      <AppEmpty icon="calendar" :title="t.empty" :text="t.emptyText" />
    </AppCard>

    <template v-for="group in groups" :key="group.key">
      <AppCard v-if="group.paging.total.value" :title="group.title" flush>
        <ul class="divide-y divide-base-300">
          <li
            v-for="l in group.paging.shown.value"
            :key="l.id"
            class="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
          >
            <span
              class="grid w-14 shrink-0 place-items-center rounded-field py-1.5"
              :class="
                l.status === 'cancelled' ? 'bg-base-200 text-base-content/50' : 'bg-primary/10 text-primary'
              "
            >
              <span class="text-xs font-medium uppercase">{{ formatDayShort(l.date).split(" ")[0] }}</span>
              <span class="text-lg font-semibold leading-tight">{{ l.date.slice(8) }}</span>
            </span>
            <div class="min-w-0 flex-1 basis-48">
              <p
                class="truncate font-medium"
                :class="{ 'line-through opacity-60': l.status === 'cancelled' }"
              >
                {{ l.title || formatDayShort(l.date) }}
              </p>
              <p class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-base-content/60">
                <span class="inline-flex items-center gap-1"
                  ><AppIcon name="clock" :size="14" />{{ l.startTime }} - {{ l.endTime }}</span
                >
                <span v-if="l.place" class="inline-flex items-center gap-1"
                  ><AppIcon name="place" :size="14" />{{ l.place }}</span
                >
                <a
                  v-if="l.onlineUrl"
                  :href="l.onlineUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link link-primary inline-flex items-center gap-1"
                  ><AppIcon name="video" :size="14" />{{ t.join }}</a
                >
                <span v-if="l.seriesId" class="inline-flex items-center gap-1"
                  ><AppIcon name="repeat" :size="14" />{{ t.weeklySeries }}</span
                >
              </p>
            </div>
            <AppBadge :tone="statusTone[lessonLabel(l)]">{{ statusText[lessonLabel(l)] }}</AppBadge>
            <div class="flex gap-1">
              <AppButton
                v-if="l.status !== 'cancelled'"
                variant="secondary"
                compact
                @click="router.push(`/lessons/${l.id}/attendance`)"
                ><AppIcon name="attendance" :size="16" />{{ t.takeAttendance }}</AppButton
              >
              <AppButton v-if="l.status === 'scheduled'" variant="ghost" compact @click="askCancel(l)">{{
                t.cancel
              }}</AppButton>
              <AppButton
                v-if="l.status === 'cancelled'"
                variant="ghost"
                compact
                @click="restore(l.id, t.restored)"
                ><AppIcon name="restore" :size="16" />{{ t.restore }}</AppButton
              >
            </div>
          </li>
        </ul>
        <AppPager v-model:page="group.paging.page.value" :pages="group.paging.pages.value" />
      </AppCard>
    </template>

    <AppModal
      :model-value="asking !== null"
      :title="t.cancelTitle"
      :close-label="messages.common.close"
      @update:model-value="asking = null"
    >
      <p>{{ t.cancelText }}</p>
      <template #actions>
        <AppButton variant="secondary" @click="doCancel('this')">{{ t.cancelOnly }}</AppButton>
        <AppButton variant="danger" @click="doCancel('following')">{{ t.cancelFollowing }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
