<script setup lang="ts">
import { LESSON_LENGTHS, type LessonFormValues } from "@/features/lessons/useLessons";
import { messages } from "@/messages";
import AppInput from "@/ui/AppInput.vue";
import AppSelect from "@/ui/AppSelect.vue";

// The fields to make lessons. Used on the page of a course and on the schedule.
defineProps<{ values: LessonFormValues; errors: Record<string, string | undefined> }>();
const t = messages.lessons;

const lengthText: Record<number, string> = { 30: t.len30, 60: t.len60, 90: t.len90, 120: t.len120 };
const lengths = LESSON_LENGTHS.map((m) => ({ value: String(m), label: lengthText[m]! }));
const repeats = [
  { value: "none", label: t.repeatNone },
  { value: "weekly", label: t.repeatWeekly },
  { value: "every_2_weeks", label: t.repeatBiweekly },
];
</script>

<template>
  <AppInput v-model="values.date" :label="t.date" type="date" :error="errors.date" />
  <AppInput v-model="values.startTime" :label="t.startTime" type="time" :error="errors.startTime" />
  <AppSelect
    v-model="values.durationMinutes"
    :label="t.duration"
    :options="lengths"
    required
    :error="errors.durationMinutes"
  />
  <AppSelect
    v-model="values.repeat"
    :label="t.repeat"
    :options="repeats"
    required
    :hint="values.repeat === 'none' ? undefined : t.repeatHint"
    :error="errors.repeat"
  />
  <div v-if="values.repeat !== 'none'" class="md:col-start-2">
    <AppInput
      v-model="values.repeatUntil"
      :label="t.repeatUntil"
      type="date"
      :hint="t.repeatUntilHint"
      :error="errors.repeatUntil"
    />
  </div>
  <AppInput v-model="values.title" :label="t.lessonTitle" :error="errors.title" />
  <AppInput
    v-model="values.onlineUrl"
    :label="t.online"
    type="url"
    :hint="t.onlineHint"
    :error="errors.onlineUrl"
  />
</template>
