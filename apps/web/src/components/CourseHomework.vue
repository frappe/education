<script setup lang="ts">
import { useRouter } from "vue-router";
import { assignmentStatusText, assignmentStatusTone, summaryLine } from "@/components/homeworkLabels";
import { formatWhen } from "@/features/format";
import { useCourseHomework } from "@/features/homework/useHomework";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";

const props = defineProps<{ courseId: string }>();
const t = messages.homework;
const router = useRouter();
const { items, loading, error } = useCourseHomework(props.courseId);
const newHomework = () => router.push(`/courses/${props.courseId}/homework/new`);
</script>

<template>
  <AppCard :title="t.title" flush>
    <template #actions>
      <AppButton compact @click="newHomework"><AppIcon name="plus" :size="16" />{{ t.new }}</AppButton>
    </template>
    <AppAlert v-if="error" kind="error" class="m-5">{{ error }}</AppAlert>
    <div v-if="loading" class="p-5"><AppLoading :label="messages.common.loading" :rows="2" /></div>
    <AppEmpty v-else-if="items.length === 0" icon="attendance" :title="t.empty" :text="t.emptyText">
      <AppButton @click="newHomework"><AppIcon name="plus" :size="18" />{{ t.new }}</AppButton>
    </AppEmpty>
    <ul v-else class="divide-y divide-base-300">
      <li v-for="a in items" :key="a.id">
        <RouterLink
          :to="`/assignments/${a.id}`"
          class="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-base-200/60"
        >
          <span class="grid size-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
            <AppIcon name="attendance" :size="22" />
          </span>
          <span class="min-w-0 flex-1 basis-56">
            <span class="block truncate font-medium">{{ a.title }}</span>
            <span class="block text-sm text-base-content/60">
              {{ summaryLine(a.questions.length, a.maxScore) }} ·
              {{ a.dueAt ? `${t.due} ${formatWhen(a.dueAt)}` : t.noDue }}
            </span>
          </span>
          <span v-if="a.status !== 'draft'" class="text-sm text-base-content/70">
            {{ fill(t.handedIn, { n: a.counts.handedIn, total: a.counts.targeted }) }}
          </span>
          <AppBadge v-if="a.counts.toGrade > 0" tone="warning">{{
            fill(t.toScore, { n: a.counts.toGrade })
          }}</AppBadge>
          <AppBadge :tone="assignmentStatusTone[a.status]">{{ assignmentStatusText[a.status] }}</AppBadge>
        </RouterLink>
      </li>
    </ul>
  </AppCard>
</template>
