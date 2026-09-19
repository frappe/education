<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { kindText } from "@/components/homeworkLabels";
import { formatWhen, hostOf } from "@/features/format";
import { dueWords, scoreText } from "@/features/homework/dates";
import { useMyWork } from "@/features/my/useMy";
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

const t = messages.my;
const route = useRoute();
const router = useRouter();
const id = String(route.params.id);
const m = useMyWork(id, { handedIn: t.handedIn });
const w = computed(() => m.work.value);
const confirming = ref(false);

async function handIn() {
  confirming.value = false;
  if (await m.handIn()) window.scrollTo({ top: 0, behavior: "smooth" });
}

// Leaving with words that are not saved yet: the browser asks first.
const warn = (e: BeforeUnloadEvent) => {
  if (m.unsaved.value) e.preventDefault();
};
onMounted(() => window.addEventListener("beforeunload", warn));
onBeforeUnmount(() => window.removeEventListener("beforeunload", warn));

const saveText = computed(() => {
  switch (m.saveState.value) {
    case "saving":
      return t.saving;
    case "saved":
      return t.saved;
    case "waiting":
      return t.waitingToSave;
    case "error":
      return t.saveError;
    default:
      return t.savedNote;
  }
});
const resultOf = (qid: string) => w.value?.results?.perQuestion.find((r) => r.questionId === qid);
const pointsText = (n: number) => (n === 1 ? t.pointOne : fill(t.pointsBadge, { n }));
const handedIn = computed(() => w.value?.blocked === "handed_in");
const choose = (qi: number, o: number) => {
  m.answers[qi]!.choice = o;
  m.changed();
};
const linkOf = (qi: number) => m.answers[qi]!.link ?? "";
const setLink = (qi: number, v: string) => {
  m.answers[qi]!.link = v;
  m.changed();
};
</script>

<template>
  <AppPage
    :title="w?.title ?? t.coursesTitle"
    :subtitle="w ? w.courseName : undefined"
    :back-to="w ? `/my/courses/${w.courseId}` : '/'"
    :back-label="t.workBack"
  >
    <template v-if="w" #actions>
      <span class="text-sm" :class="w.canEdit ? 'text-base-content/70' : 'text-base-content/50'">{{
        dueWords(w.dueAt)
      }}</span>
      <AppBadge v-if="w.isLate" tone="error">{{ t.lateBadge }}</AppBadge>
    </template>

    <AppLoading v-if="m.loading.value" :label="messages.common.loading" />
    <AppAlert v-else-if="m.notFound.value" kind="error">{{ t.notFound }}</AppAlert>
    <template v-else-if="w">
      <AppAlert v-if="w.status === 'revision_requested'" kind="warning">
        <p class="font-medium">{{ t.reasonTitle }}</p>
        <p class="whitespace-pre-wrap">{{ w.feedback }}</p>
      </AppAlert>
      <AppAlert v-if="w.blocked === 'closed'" kind="info">{{ t.blockedClosed }}</AppAlert>
      <AppAlert v-else-if="w.blocked === 'deadline'" kind="warning">{{ t.blockedDeadline }}</AppAlert>

      <!-- The confirmation: shown as soon as the work is handed in, and every time the student comes back -->
      <section
        v-if="handedIn && w.results"
        class="flex flex-col gap-3 rounded-box border p-6"
        :class="m.justHandedIn.value ? 'border-success bg-success/10' : 'border-base-300 bg-base-100'"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-start gap-4">
          <span class="grid size-12 shrink-0 place-items-center rounded-full bg-success text-success-content"
            ><AppIcon name="check" :size="26"
          /></span>
          <div class="flex flex-col gap-1">
            <h2 class="text-xl font-semibold">
              {{ w.status === "returned" ? t.totalScore : t.submittedTitle }}
            </h2>
            <p v-if="w.status === 'returned'" class="text-3xl font-semibold text-primary">
              {{ scoreText(w.score, w.maxScore) }}
            </p>
            <p class="text-base-content/70">
              {{
                fill(m.justHandedIn.value ? t.submittedNow : t.submittedBefore, {
                  when: formatWhen(w.submittedAt),
                })
              }}
              <template v-if="w.isLate"> {{ t.lateNote }}</template>
            </p>
            <p v-if="w.results.autoMax > 0" class="font-medium">
              {{ fill(t.autoScore, { a: w.results.autoAwarded, b: w.results.autoMax }) }}
            </p>
            <p v-if="w.results.waitingForTeacher > 0" class="text-base-content/70">
              {{
                w.results.autoMax > 0
                  ? w.results.waitingForTeacher === 1
                    ? t.waitTeacherOne
                    : fill(t.waitTeacher, { n: w.results.waitingForTeacher })
                  : t.waitAll
              }}
            </p>
            <div v-if="w.feedback" class="mt-2 rounded-field bg-base-200 p-3">
              <p class="text-sm text-base-content/60">{{ t.teacherWords }}</p>
              <p class="whitespace-pre-wrap break-words">{{ w.feedback }}</p>
            </div>
            <div class="mt-2">
              <AppButton variant="secondary" compact @click="router.push('/')">{{ t.backHome }}</AppButton>
            </div>
          </div>
        </div>
      </section>

      <AppCard v-if="w.instructions || w.links.length" :title="t.instructions">
        <p v-if="w.instructions" class="whitespace-pre-wrap break-words">{{ w.instructions }}</p>
        <ul v-if="w.links.length" class="flex flex-col gap-1">
          <li v-for="l in w.links" :key="l.url">
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
      </AppCard>

      <AppAlert v-if="m.error.value" kind="error">{{ m.error.value }}</AppAlert>

      <AppCard v-for="(q, qi) in w.questions" :key="q.id">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-sm text-base-content/60">
              {{ fill(t.questionN, { n: qi + 1 }) }} · {{ kindText[q.kind] }}
            </p>
            <p class="mt-1 whitespace-pre-wrap break-words text-lg font-medium">{{ q.text }}</p>
          </div>
          <AppBadge>{{ pointsText(q.points) }}</AppBadge>
        </div>

        <fieldset v-if="q.kind === 'choice'" class="flex flex-col gap-2" :disabled="!w.canEdit">
          <legend class="sr-only">{{ q.text }}</legend>
          <label
            v-for="(o, oi) in q.options"
            :key="oi"
            class="flex min-h-11 items-center gap-3 rounded-field border px-3 py-2"
            :class="[
              w.canEdit ? 'cursor-pointer' : '',
              m.answers[qi]?.choice === oi
                ? resultOf(q.id)?.correct === false
                  ? 'border-error bg-error/10'
                  : resultOf(q.id)?.correct === true
                    ? 'border-success bg-success/10'
                    : 'border-primary bg-primary/10'
                : 'border-base-300',
            ]"
          >
            <input
              type="radio"
              class="radio radio-primary"
              :name="`q-${qi}`"
              :checked="m.answers[qi]?.choice === oi"
              @change="choose(qi, oi)"
            />
            <span>{{ o }}</span>
          </label>
        </fieldset>

        <AppInput
          v-else-if="q.kind === 'short'"
          :model-value="m.answers[qi]!.text"
          :label="t.typeAnswer"
          :readonly="!w.canEdit"
          @update:model-value="
            m.answers[qi]!.text = $event;
            m.changed();
          "
        />

        <AppTextarea
          v-else-if="q.kind === 'written'"
          :model-value="m.answers[qi]!.text"
          :label="t.typeAnswer"
          :rows="8"
          :readonly="!w.canEdit"
          @update:model-value="
            m.answers[qi]!.text = $event;
            m.changed();
          "
        />

        <template v-else>
          <AppInput
            :model-value="linkOf(qi)"
            :label="t.videoLink"
            type="url"
            placeholder="https://"
            :hint="t.videoHint"
            :readonly="!w.canEdit"
            @update:model-value="setLink(qi, $event)"
          />
          <AppTextarea
            :model-value="m.answers[qi]!.text"
            :label="t.noteOptional"
            :rows="2"
            :readonly="!w.canEdit"
            @update:model-value="
              m.answers[qi]!.text = $event;
              m.changed();
            "
          />
        </template>

        <!-- How this question went, once handed in -->
        <div
          v-if="resultOf(q.id)"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-field bg-base-200 px-3 py-2 text-sm"
        >
          <template v-if="resultOf(q.id)!.correct !== null">
            <AppBadge :tone="resultOf(q.id)!.correct ? 'success' : 'error'">{{
              resultOf(q.id)!.correct ? t.resultCorrect : t.resultWrong
            }}</AppBadge>
            <span class="font-medium">{{
              fill(t.resultPoints, { a: resultOf(q.id)!.awarded ?? 0, b: q.points })
            }}</span>
            <span
              v-if="!resultOf(q.id)!.correct && resultOf(q.id)!.correctAnswer"
              class="text-base-content/70"
              >{{ fill(t.correctIs, { answer: resultOf(q.id)!.correctAnswer! }) }}</span
            >
          </template>
          <template v-else-if="resultOf(q.id)!.awarded !== null">
            <span class="font-medium">{{
              fill(t.resultPoints, { a: resultOf(q.id)!.awarded!, b: q.points })
            }}</span>
          </template>
          <span v-else class="text-base-content/70">{{ t.waitingQuestion }}</span>
        </div>
        <div v-if="resultOf(q.id)?.note" class="rounded-field border border-primary/30 bg-primary/5 p-3">
          <p class="text-sm font-medium text-primary">{{ t.teacherNote }}</p>
          <p class="whitespace-pre-wrap break-words">{{ resultOf(q.id)!.note }}</p>
        </div>
      </AppCard>

      <div
        v-if="w.canEdit"
        class="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-box md:border"
      >
        <p
          class="text-sm"
          :class="m.saveState.value === 'error' ? 'text-error' : 'text-base-content/60'"
          aria-live="polite"
        >
          {{ saveText }}
        </p>
        <AppButton :loading="m.submitting.value" @click="confirming = true"
          ><AppIcon name="send" :size="18" />{{ t.handIn }}</AppButton
        >
      </div>
    </template>

    <AppModal v-model="confirming" :title="t.handInTitle" :close-label="messages.common.close">
      <p>{{ t.handInText }}</p>
      <template #actions>
        <AppButton variant="ghost" @click="confirming = false">{{ messages.common.cancel }}</AppButton>
        <AppButton @click="handIn">{{ t.handInYes }}</AppButton>
      </template>
    </AppModal>
  </AppPage>
</template>
