<script setup lang="ts">
import { lessonLabel } from "@/features/lessons/status";
import { useRouter } from "vue-router";
import { formatDayShort, formatWeek } from "@/features/format";
import { useSchedule } from "@/features/lessons/useSchedule";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.schedule;
const l = messages.lessons;
const router = useRouter();
const { monday, days, lessons, loading, error, next, previous, thisWeek } = useSchedule();

const statusText = {
  scheduled: l.statusScheduled,
  held: l.statusHeld,
  cancelled: l.statusCancelled,
  needs_attendance: l.statusNeeds,
} as const;
const statusTone = {
  scheduled: "info",
  held: "success",
  cancelled: "neutral",
  needs_attendance: "warning",
} as const;
</script>

<template>
  <AppPage :title="t.title" :subtitle="t.subtitle">
    <template #actions>
      <div class="join">
        <button type="button" class="btn join-item min-h-11" :aria-label="t.previous" @click="previous">
          <AppIcon name="left" />
        </button>
        <button type="button" class="btn join-item min-h-11 min-w-44 font-medium" @click="thisWeek">
          {{ formatWeek(monday) }}
        </button>
        <button type="button" class="btn join-item min-h-11" :aria-label="t.next" @click="next">
          <AppIcon name="right" />
        </button>
      </div>
    </template>

    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppLoading v-if="loading && lessons.length === 0" :label="messages.common.loading" :rows="5" />
    <AppCard v-else-if="!loading && lessons.length === 0">
      <AppEmpty icon="calendar" :title="t.noneWeek" :text="t.noneWeekText">
        <AppButton @click="router.push('/courses')">{{ t.goCourses }}</AppButton>
      </AppEmpty>
    </AppCard>
    <div v-else class="flex flex-col gap-3">
      <section
        v-for="day in days"
        :key="day.date"
        class="flex flex-col gap-3 rounded-box border bg-base-100 p-4 sm:flex-row"
        :class="day.isToday ? 'border-primary' : 'border-base-300'"
      >
        <div class="w-32 shrink-0">
          <p class="font-semibold">{{ formatDayShort(day.date) }}</p>
          <AppBadge v-if="day.isToday" tone="info">{{ t.today }}</AppBadge>
        </div>
        <p v-if="day.lessons.length === 0" class="text-sm text-base-content/40">{{ t.empty }}</p>
        <ul v-else class="flex flex-1 flex-col gap-2">
          <li v-for="lesson in day.lessons" :key="lesson.id">
            <RouterLink
              :to="`/lessons/${lesson.id}/attendance`"
              class="flex flex-wrap items-center gap-3 rounded-field border border-base-300 px-3 py-2 hover:bg-base-200/60"
            >
              <span class="w-28 shrink-0 text-sm font-medium"
                >{{ lesson.startTime }} - {{ lesson.endTime }}</span
              >
              <span class="min-w-0 flex-1 basis-40">
                <span
                  class="block truncate font-medium"
                  :class="{ 'line-through opacity-60': lesson.status === 'cancelled' }"
                  >{{ lesson.title || lesson.courseName }}</span
                >
                <span class="block truncate text-sm text-base-content/60">
                  {{ lesson.courseName }}<template v-if="lesson.place"> · {{ lesson.place }}</template>
                </span>
              </span>
              <AppBadge :tone="statusTone[lessonLabel(lesson)]">{{
                statusText[lessonLabel(lesson)]
              }}</AppBadge>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </AppPage>
</template>
