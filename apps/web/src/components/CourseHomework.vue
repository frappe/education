<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import type { AssignmentInfo } from "@lms/shared";
import { assignmentStatusText, assignmentStatusTone, summaryLine } from "@/components/homeworkLabels";
import { formatWhen } from "@/features/format";
import { useCourseHomework } from "@/features/homework/useHomework";
import { usePaging } from "@/features/paging";
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

const props = defineProps<{ courseId: string }>();
const t = messages.homework;
const router = useRouter();
const { items, loading, error, remove } = useCourseHomework(props.courseId, { deleted: t.deleted });
const paging = usePaging(items);
const newHomework = () => router.push(`/courses/${props.courseId}/homework/new`);

// Deleting asks first, and says what will happen.
const deleting = ref<AssignmentInfo | null>(null);
const deleteWords = computed(() => {
  const a = deleting.value;
  if (!a) return [];
  return [
    fill(t.deleteText, { title: a.title }),
    ...(a.status !== "draft" ? [t.deleteLive] : []),
    ...(a.counts.handedIn > 0 ? [fill(t.deleteHandedIn, { n: a.counts.handedIn })] : []),
  ];
});
async function confirmDelete() {
  const a = deleting.value;
  deleting.value = null;
  if (a) await remove(a.id);
}
</script>

<template>
  <AppCard :title="t.title" flush>
    <!-- With no homework, the button is in the empty message, so it is not shown twice. -->
    <template v-if="!loading && items.length > 0" #actions>
      <AppButton compact @click="newHomework"><AppIcon name="plus" :size="16" />{{ t.new }}</AppButton>
    </template>
    <AppAlert v-if="error" kind="error" class="m-5">{{ error }}</AppAlert>
    <div v-if="loading" class="p-5"><AppLoading :label="messages.common.loading" :rows="2" /></div>
    <AppEmpty v-else-if="items.length === 0" icon="attendance" :title="t.empty" :text="t.emptyText">
      <AppButton @click="newHomework"><AppIcon name="plus" :size="18" />{{ t.new }}</AppButton>
    </AppEmpty>
    <ul v-else class="divide-y divide-base-300">
      <li v-for="a in paging.shown.value" :key="a.id" class="flex items-center hover:bg-base-200/60">
        <RouterLink
          :to="`/assignments/${a.id}`"
          class="flex min-w-0 flex-1 flex-wrap items-center gap-4 px-5 py-4"
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
        <button
          type="button"
          class="btn btn-square btn-ghost mr-3 shrink-0"
          :aria-label="fill(t.deleteOne, { title: a.title })"
          @click="deleting = a"
        >
          <AppIcon name="trash" :size="18" />
        </button>
      </li>
    </ul>
    <AppPager v-model:page="paging.page.value" :pages="paging.pages.value" />
  </AppCard>

  <AppModal
    :model-value="deleting !== null"
    :title="t.deleteTitle"
    :close-label="messages.common.close"
    @update:model-value="deleting = null"
  >
    <p v-for="(line, i) in deleteWords" :key="i">{{ line }}</p>
    <template #actions>
      <AppButton variant="ghost" @click="deleting = null">{{ messages.common.cancel }}</AppButton>
      <AppButton variant="danger" @click="confirmDelete">{{ t.delete }}</AppButton>
    </template>
  </AppModal>
</template>
