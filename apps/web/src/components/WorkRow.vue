<script setup lang="ts">
import type { MyWorkItem } from "@lms/shared";
import { computed } from "vue";
import { summaryLine } from "@/components/homeworkLabels";
import { dueWords, isOverdue, scoreText } from "@/features/homework/dates";
import { messages } from "@/messages";
import AppBadge from "@/ui/AppBadge.vue";
import AppIcon from "@/ui/AppIcon.vue";

const props = defineProps<{ item: MyWorkItem; showCourse?: boolean }>();
const t = messages.my;

const open = computed(() => ["not_started", "drafted", "revision_requested"].includes(props.item.status));
const overdue = computed(() => open.value && isOverdue(props.item.dueAt));
const label = computed(() => {
  switch (props.item.status) {
    case "returned":
      return { tone: "success" as const, text: scoreText(props.item.score, props.item.maxScore) };
    case "revision_requested":
      return { tone: "error" as const, text: t.again };
    case "submitted":
    case "graded":
      return { tone: "info" as const, text: t.waiting };
    case "drafted":
      return { tone: "neutral" as const, text: t.statusDrafted };
    default:
      return null;
  }
});
</script>

<template>
  <RouterLink
    :to="`/my/work/${item.id}`"
    class="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-base-200/60"
  >
    <span class="grid size-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
      <AppIcon name="attendance" :size="22" />
    </span>
    <span class="min-w-0 flex-1 basis-56">
      <span class="block truncate font-medium">{{ item.title }}</span>
      <span class="block truncate text-sm text-base-content/60">
        {{ summaryLine(item.questionCount, item.maxScore)
        }}<template v-if="showCourse"> · {{ item.courseName }}</template>
      </span>
    </span>
    <span
      v-if="open || item.status === 'submitted'"
      class="text-sm"
      :class="overdue ? 'font-medium text-error' : 'text-base-content/70'"
    >
      {{ dueWords(item.dueAt) }}
    </span>
    <AppBadge v-if="label" :tone="label.tone">{{ label.text }}</AppBadge>
    <AppBadge v-if="item.isLate" tone="error">{{ messages.grading.late }}</AppBadge>
  </RouterLink>
</template>
