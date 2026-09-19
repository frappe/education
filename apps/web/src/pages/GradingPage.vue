<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { kindText, submissionText, submissionTone } from "@/components/homeworkLabels";
import { formatWhen, hostOf } from "@/features/format";
import { scoreText } from "@/features/homework/dates";
import { useGrading } from "@/features/homework/useHomework";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppModal from "@/ui/AppModal.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.grading;
const route = useRoute();
const assignmentId = String(route.params.id);
const g = useGrading(assignmentId, String(route.params.studentId), {
  saved: t.saved,
  returned: t.returned,
  again: t.asked,
});
const d = computed(() => g.detail.value);

const asking = ref(false);
const reason = ref("");
async function send() {
  asking.value = false;
  await g.askAgain(reason.value);
  reason.value = "";
}
const canReturn = computed(() => d.value?.status === "graded" && !g.dirty.value);
const answerOf = (qid: string) => d.value?.answers.find((a) => a.questionId === qid);
const info = (qid: string) => d.value?.perQuestion.find((p) => p.questionId === qid);

/** One line of the history in plain words. */
function historyText(h: {
  by: string;
  oldScore: number | null;
  newScore: number | null;
  feedbackChanged: boolean;
  notesChanged: boolean;
}): string {
  const max = d.value?.assignment.maxScore ?? 0;
  if (h.oldScore !== h.newScore) {
    return h.oldScore === null
      ? fill(t.historyGave, { by: h.by, score: scoreText(h.newScore, max) })
      : fill(t.historyChanged, {
          by: h.by,
          old: scoreText(h.oldScore, max),
          new: scoreText(h.newScore, max),
        });
  }
  if (h.feedbackChanged && h.notesChanged) return fill(t.historyBoth, { by: h.by });
  return fill(h.notesChanged ? t.historyNotes : t.historyFeedback, { by: h.by });
}
const stateNote = computed(() => {
  switch (d.value?.status) {
    case "returned":
      return t.stateReturned;
    case "graded":
      return t.stateGraded;
    case "revision_requested":
      return t.stateAgain;
    default:
      return t.stateSubmitted;
  }
});
</script>

<template>
  <AppPage
    :title="d?.studentName ?? t.title"
    :subtitle="d ? d.assignment.title : undefined"
    :back-to="`/assignments/${assignmentId}`"
    :back-label="t.back"
  >
    <template v-if="d" #actions>
      <AppBadge :tone="submissionTone[d.status]">{{ submissionText[d.status] }}</AppBadge>
      <AppBadge v-if="d.isLate" tone="error">{{ t.late }}</AppBadge>
    </template>

    <AppLoading v-if="g.loading.value" :label="messages.common.loading" />
    <AppAlert v-else-if="g.notFound.value" kind="error">{{ t.notFound }}</AppAlert>
    <div v-else-if="d" class="grid gap-6 lg:grid-cols-3">
      <div class="flex min-w-0 flex-col gap-6 lg:col-span-2">
        <p class="text-sm text-base-content/60">
          {{ t.handedInAt }}: {{ formatWhen(d.submittedAt)
          }}<template v-if="d.revisionCount > 0"> · {{ fill(t.tryN, { n: d.revisionCount + 1 }) }}</template>
        </p>

        <AppCard v-for="(q, qi) in d.assignment.questions" :key="q.id">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm text-base-content/60">
                {{ fill(messages.homework.questionN, { n: qi + 1 }) }} · {{ kindText[q.kind] }}
              </p>
              <p class="mt-1 font-medium">{{ q.text }}</p>
            </div>
            <div class="flex items-end gap-2">
              <div class="w-28">
                <AppInput
                  v-model="g.points[q.id]!"
                  :label="fill(t.pointsOf, { max: q.points })"
                  inputmode="decimal"
                  :disabled="g.isAuto(q.id)"
                />
              </div>
            </div>
          </div>

          <template v-if="q.kind === 'choice'">
            <ul class="flex flex-col gap-1">
              <li
                v-for="(o, oi) in q.options"
                :key="oi"
                class="flex items-center gap-2 rounded-field border px-3 py-2 text-sm"
                :class="
                  answerOf(q.id)?.choice === oi
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-base-300'
                "
              >
                <span class="flex-1">{{ o }}</span>
                <AppBadge v-if="q.correct === oi" tone="success">{{ t.correctMark }}</AppBadge>
              </li>
            </ul>
            <p v-if="answerOf(q.id)?.choice == null" class="text-sm text-base-content/60">
              {{ t.notAnswered }}
            </p>
          </template>
          <template v-else-if="q.kind === 'speaking'">
            <div v-if="answerOf(q.id)?.link" class="rounded-field bg-base-200 p-3">
              <p class="text-sm text-base-content/60">{{ t.videoLink }}</p>
              <a
                :href="answerOf(q.id)!.link!"
                target="_blank"
                rel="noopener noreferrer"
                class="link link-primary inline-flex items-center gap-1 break-all"
              >
                <AppIcon name="video" :size="16" />{{ answerOf(q.id)!.link }}
              </a>
              <p class="text-xs text-base-content/60">{{ hostOf(answerOf(q.id)!.link!) }}</p>
            </div>
            <div v-if="answerOf(q.id)?.text">
              <p class="text-sm text-base-content/60">{{ t.noteFromStudent }}</p>
              <p class="whitespace-pre-wrap break-words">{{ answerOf(q.id)!.text }}</p>
            </div>
          </template>
          <template v-else>
            <p
              v-if="answerOf(q.id)?.text"
              class="whitespace-pre-wrap break-words rounded-field bg-base-200 p-3"
            >
              {{ answerOf(q.id)!.text }}
            </p>
            <p v-else class="text-sm text-base-content/60">{{ t.noAnswer }}</p>
            <p v-if="q.kind === 'short' && q.accepted.length" class="text-sm text-base-content/60">
              {{ fill(messages.homework.correctIs, { answer: q.accepted.join(" / ") }) }}
            </p>
          </template>

          <AppTextarea v-model="g.notes[q.id]!" :label="t.noteLabel" :hint="t.noteHint" :rows="2" />

          <p class="flex items-center gap-2 text-sm">
            <template v-if="info(q.id)?.auto">
              <AppBadge :tone="info(q.id)?.correct ? 'success' : 'error'">{{
                info(q.id)?.correct ? t.correct : t.incorrect
              }}</AppBadge>
              <span class="text-base-content/60">{{ messages.homework.scoredBySystem }}</span>
            </template>
            <span v-else class="text-base-content/60">{{ messages.homework.scoredByYou }}</span>
          </p>
        </AppCard>

        <AppCard :title="t.history" flush>
          <p v-if="d.history.length === 0" class="p-5 text-sm text-base-content/60">{{ t.noHistory }}</p>
          <ul v-else class="divide-y divide-base-300">
            <li
              v-for="(h, i) in d.history"
              :key="i"
              class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
            >
              <span>{{ historyText(h) }}</span>
              <span class="text-base-content/60">{{ formatWhen(h.at) }}</span>
            </li>
          </ul>
        </AppCard>
      </div>

      <div class="flex min-w-0 flex-col gap-6">
        <AppCard class="lg:sticky lg:top-6" :title="t.totalTitle" :description="stateNote">
          <AppAlert v-if="g.error.value" kind="error">{{ g.error.value }}</AppAlert>
          <p class="text-3xl font-semibold text-primary">
            {{ scoreText(g.complete.value ? g.total.value : null, d.assignment.maxScore) }}
          </p>
          <p v-if="!g.complete.value" class="text-sm text-base-content/60">{{ t.pointsMissing }}</p>
          <AppTextarea v-model="g.feedback.value" :label="t.feedback" :rows="5" :hint="t.feedbackHint" />
          <p v-if="g.dirty.value" class="text-sm text-warning">{{ t.unsaved }}</p>
          <div class="flex flex-wrap gap-2">
            <AppButton
              :loading="g.busy.value"
              :disabled="!g.dirty.value || !g.complete.value"
              @click="g.save"
              >{{ t.save }}</AppButton
            >
            <AppButton variant="secondary" :disabled="!canReturn || g.busy.value" @click="g.giveBack"
              ><AppIcon name="send" :size="16" />{{ t.giveBack }}</AppButton
            >
          </div>
          <AppButton variant="ghost" compact @click="asking = true">{{ t.askAgain }}</AppButton>
        </AppCard>
      </div>
    </div>

    <AppModal v-model="asking" :title="t.askTitle" :close-label="messages.common.close">
      <p>{{ t.askText }}</p>
      <AppTextarea v-model="reason" :label="t.reason" :rows="4" />
      <template #actions>
        <AppButton variant="ghost" @click="asking = false">{{ messages.common.cancel }}</AppButton>
        <AppButton :disabled="reason.trim() === ''" @click="send">{{ t.send }}</AppButton>
      </template>
    </AppModal>
  </AppPage>
</template>
