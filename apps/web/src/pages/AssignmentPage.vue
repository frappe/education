<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  assignmentStatusText,
  assignmentStatusTone,
  kindText,
  submissionText,
  submissionTone,
  summaryLine,
} from "@/components/homeworkLabels";
import { formatWhen, hostOf } from "@/features/format";
import { scoreText } from "@/features/homework/dates";
import { useAssignmentPage } from "@/features/homework/useHomework";
import { useToast } from "@/features/toast/useToast";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppModal from "@/ui/AppModal.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTable from "@/ui/AppTable.vue";

const t = messages.homework;
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = String(route.params.id);
const p = useAssignmentPage(id, {
  published: t.published,
  closed: t.closed,
  time: t.timeGiven,
  timeRemoved: t.timeTaken,
});
const a = computed(() => p.assignment.value);

// More time for one student
const extendFor = ref<string | null>(null);
const extDate = ref("");
const extTime = ref("18:00");
async function giveTime() {
  if (!extendFor.value) return;
  await p.giveTime(extendFor.value, extDate.value, extTime.value);
  extendFor.value = null;
}

const deleting = ref(false);
async function remove() {
  deleting.value = false;
  if (await p.remove()) {
    toast.success(t.deleted);
    void router.replace(`/courses/${a.value?.courseId}?tab=homework`);
  }
}
const canDelete = computed(
  () => a.value?.status === "draft" && p.rows.value.every((r) => r.status === "not_started"),
);
</script>

<template>
  <AppPage
    :title="a?.title ?? t.title"
    :back-to="a ? `/courses/${a.courseId}?tab=homework` : '/courses'"
    :back-label="t.backToCourse"
  >
    <template v-if="a" #actions>
      <AppBadge>{{ summaryLine(a.questions.length, a.maxScore) }}</AppBadge>
      <AppBadge :tone="assignmentStatusTone[a.status]">{{ assignmentStatusText[a.status] }}</AppBadge>
      <AppButton v-if="a.status !== 'published'" compact @click="p.publish"
        ><AppIcon name="send" :size="16" />{{ a.status === "closed" ? t.reopen : t.publish }}</AppButton
      >
      <AppButton v-else variant="secondary" compact @click="p.close">{{ t.close }}</AppButton>
      <AppButton variant="secondary" compact @click="router.push(`/assignments/${a.id}/edit`)"
        ><AppIcon name="edit" :size="16" />{{ t.edit }}</AppButton
      >
      <AppButton v-if="canDelete" variant="ghost" compact @click="deleting = true">{{ t.delete }}</AppButton>
    </template>

    <AppLoading v-if="p.loading.value" :label="messages.common.loading" />
    <AppAlert v-else-if="p.notFound.value" kind="error">{{ t.notFound }}</AppAlert>
    <template v-else-if="a">
      <AppCard>
        <p v-if="a.instructions" class="whitespace-pre-wrap break-words">{{ a.instructions }}</p>
        <ol class="flex flex-col gap-2 text-sm">
          <li v-for="(q, i) in a.questions" :key="q.id" class="rounded-field bg-base-200 px-3 py-2">
            <span class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-medium">{{ i + 1 }}. {{ q.text }}</span>
              <span class="flex items-center gap-2 text-base-content/60">
                {{ kindText[q.kind] }} ·
                {{ q.points === 1 ? t.pointsOne : fill(t.pointsTotal, { n: q.points }) }}
                <AppBadge
                  :tone="
                    (q.kind === 'choice' && q.correct !== null) || (q.kind === 'short' && q.accepted.length)
                      ? 'success'
                      : 'neutral'
                  "
                >
                  {{
                    (q.kind === "choice" && q.correct !== null) || (q.kind === "short" && q.accepted.length)
                      ? t.scoredBySystem
                      : t.scoredByYou
                  }}
                </AppBadge>
              </span>
            </span>
            <span v-if="q.kind === 'choice'" class="mt-1 block text-base-content/70">
              <template v-for="(o, oi) in q.options" :key="oi"
                ><span :class="{ 'font-semibold text-success': q.correct === oi }">{{ o }}</span
                ><span v-if="oi < q.options.length - 1"> · </span></template
              >
            </span>
            <span
              v-else-if="q.kind === 'short' && q.accepted.length"
              class="mt-1 block text-base-content/70"
              >{{ fill(t.correctIs, { answer: q.accepted.join(" / ") }) }}</span
            >
          </li>
        </ol>
        <ul v-if="a.links.length" class="flex flex-col gap-1">
          <li v-for="l in a.links" :key="l.url">
            <a
              :href="l.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link link-primary inline-flex items-center gap-1"
            >
              <AppIcon name="link" :size="14" />{{ l.title }}
              <span class="text-xs text-base-content/60">({{ hostOf(l.url) }})</span>
            </a>
          </li>
        </ul>
        <p class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-base-content/70">
          <span class="inline-flex items-center gap-1"
            ><AppIcon name="clock" :size="14" />{{
              a.dueAt ? `${t.due} ${formatWhen(a.dueAt)}` : t.noDue
            }}</span
          >
          <span v-if="a.allowLate">{{ t.lateOk }}</span>
          <span>{{ a.targetMode === "all" ? t.forAll : t.forSome }}</span>
        </p>
      </AppCard>

      <AppCard :title="t.answers" flush>
        <AppEmpty v-if="p.rows.value.length === 0" icon="users" :title="t.noStudents" />
        <AppTable v-else>
          <thead>
            <tr>
              <th>{{ t.student }}</th>
              <th>{{ t.state }}</th>
              <th>{{ t.score }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in p.rows.value" :key="r.studentId">
              <td>
                <span class="flex items-center gap-3">
                  <AppAvatar :name="r.studentName" size="sm" />
                  <span class="font-medium">{{ r.studentName }}</span>
                </span>
              </td>
              <td>
                <span class="flex flex-wrap items-center gap-2">
                  <AppBadge :tone="submissionTone[r.status]">{{ submissionText[r.status] }}</AppBadge>
                  <AppBadge v-if="r.isLate" tone="error">{{ t.late }}</AppBadge>
                  <span v-if="r.extensionUntil" class="text-xs text-base-content/60">{{
                    fill(t.extendUntil, { when: formatWhen(r.extensionUntil) })
                  }}</span>
                </span>
              </td>
              <td>{{ scoreText(r.score, a.maxScore) }}</td>
              <td class="text-right">
                <div class="flex justify-end gap-1">
                  <AppButton
                    v-if="r.status !== 'not_started'"
                    variant="secondary"
                    compact
                    @click="router.push(`/assignments/${a.id}/students/${r.studentId}`)"
                    >{{ t.open }}</AppButton
                  >
                  <AppButton
                    v-if="a.status !== 'draft'"
                    variant="ghost"
                    compact
                    @click="extendFor = r.studentId"
                    >{{ t.extend }}</AppButton
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>
    </template>

    <AppModal
      :model-value="extendFor !== null"
      :title="t.extendTitle"
      :close-label="messages.common.close"
      @update:model-value="extendFor = null"
    >
      <p>{{ t.extendText }}</p>
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="extDate" :label="t.dueDate" type="date" />
        <AppInput v-model="extTime" :label="t.dueTime" type="time" />
      </div>
      <template #actions>
        <AppButton
          v-if="p.rows.value.find((r) => r.studentId === extendFor)?.extensionUntil"
          variant="ghost"
          @click="
            p.takeTime(extendFor!);
            extendFor = null;
          "
          >{{ t.extendTake }}</AppButton
        >
        <AppButton :disabled="!extDate" @click="giveTime">{{ t.extendGive }}</AppButton>
      </template>
    </AppModal>

    <AppModal v-model="deleting" :title="t.deleteTitle" :close-label="messages.common.close">
      <p>{{ t.deleteText }}</p>
      <template #actions>
        <AppButton variant="ghost" @click="deleting = false">{{ messages.common.cancel }}</AppButton>
        <AppButton variant="danger" @click="remove">{{ t.delete }}</AppButton>
      </template>
    </AppModal>
  </AppPage>
</template>
