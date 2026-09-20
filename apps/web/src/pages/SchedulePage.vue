<script setup lang="ts">
import { computed, ref } from "vue";
import LessonFields from "@/components/LessonFields.vue";
import { formatDayShort, formatWeek, startOfWeek, today } from "@/features/format";
import { lessonLabel } from "@/features/lessons/status";
import { useNewLesson } from "@/features/lessons/useLessons";
import { useSchedule } from "@/features/lessons/useSchedule";
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
import AppPage from "@/ui/AppPage.vue";
import AppSelect from "@/ui/AppSelect.vue";

const t = messages.schedule;
const l = messages.lessons;
const { monday, days, lessons, loading, error, next, previous, thisWeek, goToWeekOf } = useSchedule();

// Making lessons from here. They can also be made on the page of a course.
const adding = ref(false);
const made = useNewLesson({ added: (n) => (n === 1 ? l.addedOne : fill(l.added, { n })) }, (created) => {
  adding.value = false;
  goToWeekOf(created[0]?.date ?? monday.value);
});
const courseOptions = computed(() => made.courses.value.map((c) => ({ value: c.id, label: c.name })));
async function openAdd() {
  adding.value = true;
  // Today when the week on screen is this week, else the first day of that week.
  await made.open(startOfWeek(today()) === monday.value ? today() : monday.value);
}
function add() {
  if (!made.courseId.value) {
    made.courseError.value = t.chooseCourse;
    return;
  }
  made.courseError.value = undefined;
  void made.form.submit();
}
/** The second line of a lesson: the course (when the title already says something else), the students and the place. */
const details = (lesson: (typeof lessons.value)[number]) =>
  [
    lesson.title ? lesson.courseName : "",
    lesson.students.length ? lesson.students.join(", ") : t.noStudents,
    lesson.place,
  ]
    .filter((x) => x !== "")
    .join(" · ");

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
      <AppButton @click="openAdd"><AppIcon name="calendar-plus" :size="18" />{{ t.addLesson }}</AppButton>
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
        <AppButton @click="openAdd">{{ t.addLesson }}</AppButton>
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
                <span class="block truncate text-sm text-base-content/60">{{ details(lesson) }}</span>
              </span>
              <AppBadge :tone="statusTone[lessonLabel(lesson)]">{{
                statusText[lessonLabel(lesson)]
              }}</AppBadge>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>

    <AppModal v-model="adding" :title="t.addLesson" :close-label="messages.common.close">
      <AppLoading v-if="made.loadingCourses.value" :label="messages.common.loading" />
      <AppAlert v-else-if="courseOptions.length === 0 && made.courseError.value" kind="error">{{
        made.courseError.value
      }}</AppAlert>
      <p v-else-if="courseOptions.length === 0" class="text-base-content/70">{{ t.noCourses }}</p>
      <form
        v-else
        id="add-lesson"
        class="grid gap-x-4 gap-y-3 md:grid-cols-2"
        novalidate
        @submit.prevent="add"
      >
        <AppAlert v-if="made.form.formError.value" kind="error" class="md:col-span-2">{{
          made.form.formError.value
        }}</AppAlert>
        <div class="md:col-span-2">
          <AppSelect
            v-model="made.courseId.value"
            :label="t.course"
            :options="courseOptions"
            :placeholder="t.chooseCourse"
            :error="made.courseError.value"
          />
        </div>
        <LessonFields :values="made.form.values" :errors="made.form.errors.value" />
      </form>
      <template #actions>
        <AppButton variant="ghost" @click="adding = false">{{ messages.common.cancel }}</AppButton>
        <AppButton
          v-if="courseOptions.length"
          type="submit"
          :loading="made.form.submitting.value"
          @click="add"
          >{{ l.add }}</AppButton
        >
        <RouterLink v-else to="/courses/new" class="btn btn-primary min-h-11">{{ t.newCourse }}</RouterLink>
      </template>
    </AppModal>
  </AppPage>
</template>
