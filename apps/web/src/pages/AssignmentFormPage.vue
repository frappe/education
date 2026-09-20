<script setup lang="ts">
import type { QuestionKind } from "@lms/shared";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { kindIcon, kindText } from "@/components/homeworkLabels";
import { useAssignmentForm } from "@/features/homework/useHomework";
import { goBack } from "@/features/navigation/back";
import { useToast } from "@/features/toast/useToast";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppSegmented from "@/ui/AppSegmented.vue";
import AppSelect from "@/ui/AppSelect.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.homework;
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = computed(() => (route.params.id ? String(route.params.id) : undefined));
const courseId = computed(() => (route.params.courseId ? String(route.params.courseId) : undefined));

const f = useAssignmentForm(courseId.value, id.value, (a) => {
  toast.success(id.value ? t.saved : t.created);
  void router.replace(`/assignments/${a.id}`);
});
const v = f.form.values;
const err = f.form.errors;
const who = [
  { value: "all", label: t.forAll, tone: "neutral" as const },
  { value: "selected", label: t.forSome, tone: "neutral" as const },
];
const kinds = (Object.keys(kindText) as QuestionKind[]).map((k) => ({ value: k, label: kindText[k] }));
const hints = {
  choice: t.hintChoice,
  short: t.hintShort,
  written: t.hintWritten,
  speaking: t.hintSpeaking,
} as const;
const adders: { kind: QuestionKind; label: string }[] = [
  { kind: "choice", label: t.addChoice },
  { kind: "short", label: t.addShort },
  { kind: "written", label: t.addWritten },
  { kind: "speaking", label: t.addSpeaking },
];
const backTo = computed(() =>
  id.value ? `/assignments/${id.value}` : `/courses/${courseId.value}?tab=homework`,
);
</script>

<template>
  <AppPage
    :title="id ? t.editTitle : t.newTitle"
    :subtitle="id ? undefined : t.newText"
    :back-to="backTo"
    :back-label="t.backToCourse"
  >
    <AppLoading v-if="f.loading.value" :label="messages.common.loading" />
    <AppAlert v-else-if="f.notFound.value" kind="error">{{ t.notFound }}</AppAlert>
    <form v-else class="flex flex-col gap-6" novalidate @submit.prevent="f.form.submit">
      <AppAlert v-if="f.form.formError.value" kind="error">{{ f.form.formError.value }}</AppAlert>

      <AppCard>
        <AppInput v-model="v.title" :label="t.name" :error="err.title" />
        <AppTextarea v-model="v.instructions" :label="t.instructions" :rows="3" :error="err.instructions" />
      </AppCard>

      <AppCard :title="t.questions" :description="t.questionsText">
        <template #actions>
          <span class="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{{
            fill(t.totalPoints, { n: f.total.value })
          }}</span>
        </template>
        <AppAlert v-if="err.questions" kind="error">{{ err.questions }}</AppAlert>
        <AppAlert v-if="f.wordsOnly.value" kind="warning">{{ t.lockedNote }}</AppAlert>

        <div
          v-for="(q, qi) in v.questions"
          :key="qi"
          class="flex flex-col gap-4 rounded-box border border-base-300 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="flex items-center gap-2 font-medium">
              <span class="grid size-8 place-items-center rounded-full bg-primary/10 text-sm text-primary">{{
                qi + 1
              }}</span>
              {{ kindText[q.kind] }}
            </p>
            <AppButton v-if="v.questions.length > 1" variant="ghost" compact @click="f.removeQuestion(qi)"
              ><AppIcon name="close" :size="16" />{{ t.removeQuestion }}</AppButton
            >
          </div>

          <div class="grid gap-x-4 gap-y-3 md:grid-cols-3">
            <div class="md:col-span-2">
              <AppTextarea v-model="q.text" :label="t.questionText" :rows="2" />
            </div>
            <div class="flex flex-col gap-3">
              <AppInput v-model="q.points" :label="t.questionPoints" inputmode="decimal" />
              <AppSelect
                :model-value="q.kind"
                :label="t.questionKind"
                :options="kinds"
                required
                :class="{ 'pointer-events-none opacity-60': f.wordsOnly.value }"
                @update:model-value="f.setKind(qi, $event as QuestionKind)"
              />
            </div>
          </div>
          <p class="flex items-start gap-2 text-sm text-base-content/60">
            <AppIcon :name="kindIcon[q.kind]" :size="16" class="mt-0.5" />{{ hints[q.kind] }}
          </p>

          <template v-if="q.kind === 'choice'">
            <div v-for="(_, oi) in q.options" :key="oi" class="flex items-end gap-2">
              <label
                class="mb-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                :title="t.correctAnswer"
              >
                <input
                  type="radio"
                  class="radio radio-primary"
                  :name="`correct-${qi}`"
                  :checked="q.correct === oi"
                  :aria-label="t.correctAnswer"
                  @change="f.setCorrect(qi, oi)"
                />
              </label>
              <div class="flex-1">
                <AppInput v-model="q.options[oi]!" :label="fill(t.answerN, { n: oi + 1 })" />
              </div>
              <button
                v-if="q.options.length > 2"
                type="button"
                class="btn btn-square btn-ghost mb-0.5"
                :aria-label="t.removeAnswer"
                @click="f.removeOption(qi, oi)"
              >
                <AppIcon name="close" :size="18" />
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <AppButton v-if="q.options.length < 6" variant="ghost" compact @click="f.addOption(qi)"
                ><AppIcon name="plus" :size="16" />{{ t.addAnswer }}</AppButton
              >
              <AppButton v-if="q.correct !== null" variant="ghost" compact @click="f.setCorrect(qi, null)">{{
                t.noCorrect
              }}</AppButton>
            </div>
            <p class="text-sm" :class="q.correct !== null ? 'text-success' : 'text-base-content/60'">
              {{ q.correct !== null ? t.scoredBySystem : t.scoredByYou }}
            </p>
          </template>

          <template v-else-if="q.kind === 'short'">
            <div v-for="(_, ai) in q.accepted" :key="ai" class="flex items-end gap-2">
              <div class="flex-1">
                <AppInput v-model="q.accepted[ai]!" :label="fill(t.acceptedN, { n: ai + 1 })" />
              </div>
              <button
                type="button"
                class="btn btn-square btn-ghost mb-0.5"
                :aria-label="t.removeAccepted"
                @click="f.removeAccepted(qi, ai)"
              >
                <AppIcon name="close" :size="18" />
              </button>
            </div>
            <div>
              <AppButton v-if="q.accepted.length < 10" variant="ghost" compact @click="f.addAccepted(qi)"
                ><AppIcon name="plus" :size="16" />{{ t.addAccepted }}</AppButton
              >
            </div>
            <p
              class="text-sm"
              :class="q.accepted.some((x) => x.trim() !== '') ? 'text-success' : 'text-base-content/60'"
            >
              {{ q.accepted.some((x) => x.trim() !== "") ? t.scoredBySystem : t.scoredByYou }}
            </p>
          </template>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium">{{ t.addQuestionLabel }}:</span>
          <AppButton
            v-for="x in adders"
            :key="x.kind"
            variant="secondary"
            compact
            :disabled="f.wordsOnly.value"
            @click="f.addQuestion(x.kind)"
          >
            <AppIcon name="plus" :size="16" />{{ x.label }}
          </AppButton>
        </div>
      </AppCard>

      <AppCard :title="t.links" :description="t.linksHint">
        <AppAlert v-if="err.links" kind="error">{{ err.links }}</AppAlert>
        <div v-for="(l, li) in v.links" :key="li" class="grid items-end gap-3 md:grid-cols-[1fr_2fr_auto]">
          <AppInput v-model="l.title" :label="t.linkTitle" />
          <AppInput v-model="l.url" :label="t.linkUrl" type="url" placeholder="https://" />
          <button
            type="button"
            class="btn btn-square btn-ghost mb-0.5"
            :aria-label="t.removeLink"
            @click="f.removeLink(li)"
          >
            <AppIcon name="close" :size="18" />
          </button>
        </div>
        <div>
          <AppButton v-if="v.links.length < 10" variant="secondary" @click="f.addLink"
            ><AppIcon name="plus" :size="18" />{{ t.addLink }}</AppButton
          >
        </div>
      </AppCard>

      <AppCard>
        <div class="grid gap-x-4 gap-y-3 md:grid-cols-2">
          <AppInput v-model="v.dueDate" :label="t.dueDate" type="date" :error="err.dueDate" />
          <AppInput v-model="v.dueTime" :label="t.dueTime" type="time" :error="err.dueTime" />
          <p class="text-sm text-base-content/60 md:col-span-2">{{ t.dueHint }}</p>
          <div class="md:col-span-2"><AppCheckbox v-model="v.allowLate" :label="t.allowLate" /></div>
        </div>
      </AppCard>

      <AppCard :title="t.forWho">
        <AppSegmented v-model="v.targetMode" :options="who" :label="t.forWho" />
        <template v-if="v.targetMode === 'selected'">
          <AppAlert v-if="err.studentIds" kind="error">{{ err.studentIds }}</AppAlert>
          <p v-if="f.students.value.length === 0" class="text-base-content/60">{{ t.noStudents }}</p>
          <ul v-else class="flex flex-col gap-1">
            <li v-for="s in f.students.value" :key="s.studentId" class="flex min-h-11 items-center gap-3">
              <input
                :id="`t-${s.studentId}`"
                type="checkbox"
                class="checkbox checkbox-primary"
                :checked="v.studentIds.includes(s.studentId)"
                @change="f.toggleStudent(s.studentId)"
              />
              <label :for="`t-${s.studentId}`" class="flex flex-1 cursor-pointer items-center gap-3 text-sm">
                <AppAvatar :name="s.studentName" size="sm" />{{ s.studentName }}
              </label>
            </li>
          </ul>
        </template>
      </AppCard>

      <div class="flex gap-3">
        <AppButton type="submit" :loading="f.form.submitting.value">{{ t.save }}</AppButton>
        <AppButton variant="ghost" @click="goBack(router, backTo)">{{ messages.common.cancel }}</AppButton>
      </div>
    </form>
  </AppPage>
</template>
