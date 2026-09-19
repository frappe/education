<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { formatDayLong } from "@/features/format";
import { useAttendance } from "@/features/lessons/useAttendance";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppSegmented from "@/ui/AppSegmented.vue";
import AppStat from "@/ui/AppStat.vue";

const t = messages.attendance;
const route = useRoute();
const a = useAttendance(String(route.params.id));

const lesson = computed(() => a.sheet.value?.lesson ?? null);
const title = computed(() => lesson.value?.title || lesson.value?.courseName || t.title);
const options = [
  { value: "attended", label: t.attended, tone: "success" as const },
  { value: "absent", label: t.absent, tone: "error" as const },
];
</script>

<template>
  <AppPage
    :title="title"
    :subtitle="lesson ? `${formatDayLong(lesson.date)} · ${lesson.startTime} - ${lesson.endTime}` : undefined"
    :back-to="lesson ? `/courses/${lesson.courseId}?tab=lessons` : '/schedule'"
    :back-label="t.back"
  >
    <AppLoading v-if="a.loading.value" :label="messages.common.loading" />
    <AppAlert v-else-if="a.notFound.value" kind="error">{{ t.notFound }}</AppAlert>
    <template v-else-if="lesson">
      <AppAlert v-if="a.error.value" kind="error">{{ a.error.value }}</AppAlert>
      <AppAlert v-if="lesson.status === 'cancelled'" kind="warning">{{ t.cancelledNote }}</AppAlert>
      <AppAlert v-else-if="!a.isPast.value" kind="info">{{ t.notStarted }}</AppAlert>
      <AppAlert v-else kind="info">{{ t.hint }}</AppAlert>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppStat :value="a.attended.value" :label="t.attended" icon="done" tone="secondary" />
        <AppStat :value="a.absent.value" :label="t.absent" icon="ban" tone="accent" />
      </div>

      <AppCard :title="fill(t.students, { n: a.students.value.length })" flush>
        <template v-if="a.canSave.value && a.students.value.length" #actions>
          <AppButton variant="ghost" compact @click="a.setAll('attended')">{{ t.allAttended }}</AppButton>
          <AppButton variant="ghost" compact @click="a.setAll('absent')">{{ t.allAbsent }}</AppButton>
        </template>
        <AppEmpty
          v-if="a.students.value.length === 0"
          icon="users"
          :title="t.noStudents"
          :text="t.noStudentsText"
        />
        <ul v-else class="divide-y divide-base-300">
          <li
            v-for="s in a.students.value"
            :key="s.studentId"
            class="flex flex-wrap items-center gap-3 px-5 py-3"
          >
            <AppAvatar :name="s.name" />
            <div class="min-w-0 flex-1 basis-40">
              <p class="truncate font-medium">{{ s.name }}</p>
              <p class="flex flex-wrap gap-2 text-xs text-base-content/60">
                <span v-if="s.joinedAfter">{{ t.joinedAfter }}</span>
                <span v-if="!s.inCourse">{{ t.left }}</span>
                <AppBadge v-if="!s.saved" tone="warning">{{ t.unsaved }}</AppBadge>
              </p>
            </div>
            <AppSegmented
              v-model="a.choice.value[s.studentId]!"
              :options="options"
              :label="s.name"
              :class="{ 'pointer-events-none opacity-60': !a.canSave.value }"
            />
          </li>
        </ul>
      </AppCard>

      <div
        v-if="a.canSave.value && a.students.value.length"
        class="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-box md:border"
      >
        <p class="text-sm text-base-content/70">
          {{ fill(t.summary, { a: a.attended.value, b: a.absent.value }) }}
        </p>
        <AppButton :loading="a.busy.value" :disabled="!a.dirty.value" @click="a.save(t.saved)">
          <AppIcon name="check" :size="18" />{{ t.save }}
        </AppButton>
      </div>
    </template>
  </AppPage>
</template>
