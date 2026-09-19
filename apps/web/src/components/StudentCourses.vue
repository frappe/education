<script setup lang="ts">
import { describeEnroll } from "@/features/enrollments/describe";
import { useStudentCourses } from "@/features/enrollments/useStudentCourses";
import { formatVnd } from "@/features/format";
import { computed } from "vue";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppLink from "@/ui/AppLink.vue";
import AppSelect from "@/ui/AppSelect.vue";

const props = defineProps<{ studentId: string; archived: boolean }>();
const t = messages.studentCourses;
const r = messages.roster;
const { courses, available, chosen, loading, busy, error, result, add } = useStudentCourses(props.studentId);

const statusText = {
  active: r.statusActive,
  completed: r.statusCompleted,
  dropped: r.statusDropped,
  pending: r.statusActive,
} as const;
const options = computed(() => available.value.map((c) => ({ value: c.id, label: c.name })));
const summary = computed(() => (result.value ? describeEnroll(result.value, r) : ""));
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="text-lg font-medium">{{ t.title }}</h2>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="loading">{{ messages.common.loading }}</p>
    <p v-else-if="courses.length === 0" class="text-[var(--color-text-muted)]">{{ t.empty }}</p>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="c in courses"
        :key="c.courseId"
        class="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <AppLink :to="`/courses/${c.courseId}`">{{ c.courseName }}</AppLink>
          <span class="text-sm text-[var(--color-text-muted)]">{{ statusText[c.status] }}</span>
        </div>
        <p class="text-sm text-[var(--color-text-muted)]">
          {{
            c.customPrice === null
              ? `${t.coursePrice}: ${formatVnd(c.pricePerLesson)}`
              : `${t.ownPrice}: ${formatVnd(c.customPrice)}`
          }}
        </p>
      </li>
    </ul>

    <template v-if="!archived && !loading">
      <AppAlert v-if="summary" :kind="result?.enrolled ? 'success' : 'info'">{{ summary }}</AppAlert>
      <p v-if="options.length === 0" class="text-sm text-[var(--color-text-muted)]">{{ t.none }}</p>
      <div v-else class="flex flex-wrap items-end gap-3">
        <AppSelect v-model="chosen" :label="t.add" :options="options" :placeholder="t.choose" />
        <AppButton :disabled="!chosen" :loading="busy" @click="add">{{ t.addButton }}</AppButton>
      </div>
    </template>
  </section>
</template>
