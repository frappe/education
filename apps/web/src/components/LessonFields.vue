<script setup lang="ts">
import type { LessonFormValues } from "@/features/lessons/useLessons";
import { messages } from "@/messages";
import AppInput from "@/ui/AppInput.vue";

// The fields to make lessons. Used on the page of a course and on the schedule.
defineProps<{ values: LessonFormValues; errors: Record<string, string | undefined> }>();
const t = messages.lessons;
</script>

<template>
  <AppInput v-model="values.date" :label="t.date" type="date" :error="errors.date" />
  <AppInput v-model="values.startTime" :label="t.startTime" type="time" :error="errors.startTime" />
  <AppInput
    v-model="values.durationMinutes"
    :label="t.duration"
    inputmode="numeric"
    :error="errors.durationMinutes"
  />
  <AppInput
    v-model="values.repeatWeeks"
    :label="t.repeat"
    inputmode="numeric"
    :hint="t.repeatHint"
    :error="errors.repeatWeeks"
  />
  <AppInput v-model="values.title" :label="t.lessonTitle" :error="errors.title" />
  <AppInput v-model="values.place" :label="t.place" :error="errors.place" />
  <div class="md:col-span-2">
    <AppInput
      v-model="values.onlineUrl"
      :label="t.online"
      type="url"
      :hint="t.onlineHint"
      :error="errors.onlineUrl"
    />
  </div>
</template>
