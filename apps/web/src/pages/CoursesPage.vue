<script setup lang="ts">
import { watch } from "vue";
import { useCourseList } from "@/features/courses/useCourses";
import { formatDay, formatVnd } from "@/features/format";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";
import { useRouter } from "vue-router";

const t = messages.courses;
const router = useRouter();
const { courses, loading, showArchived, error, load } = useCourseList();
watch(showArchived, load);

const statusText = { draft: t.statusDraft, active: t.statusActive, archived: t.statusArchived } as const;
</script>

<template>
  <AppPage :title="t.title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <AppButton @click="router.push('/courses/new')">{{ t.new }}</AppButton>
      <AppCheckbox v-model="showArchived" :label="t.showArchived" />
    </div>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="loading">{{ messages.common.loading }}</p>
    <p v-else-if="courses.length === 0" class="text-[var(--color-text-muted)]">{{ t.empty }}</p>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="c in courses"
        :key="c.id"
        class="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <AppLink :to="`/courses/${c.id}`">{{ c.name }}</AppLink>
          <span class="text-sm text-[var(--color-text-muted)]">{{ statusText[c.status] }}</span>
        </div>
        <p class="text-sm text-[var(--color-text-muted)]">
          {{ t.price }}: {{ formatVnd(c.pricePerLesson) }} ·
          {{
            c.maxStudents === null
              ? fill(t.placesNoLimit, { n: c.enrolledCount })
              : fill(t.places, { n: c.enrolledCount, max: c.maxStudents })
          }}
          <template v-if="c.startDate"> · {{ t.from }} {{ formatDay(c.startDate) }}</template>
          <template v-if="c.endDate"> · {{ t.until }} {{ formatDay(c.endDate) }}</template>
        </p>
      </li>
    </ul>
    <AppLink to="/">{{ messages.common.back }}</AppLink>
  </AppPage>
</template>
