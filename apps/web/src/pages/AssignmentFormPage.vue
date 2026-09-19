<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAssignmentForm } from "@/features/homework/useHomework";
import { useToast } from "@/features/toast/useToast";
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
const kinds = [
  { value: "essay", label: t.typeEssay, tone: "neutral" as const },
  { value: "speaking", label: t.typeSpeaking, tone: "neutral" as const },
  { value: "multiple_choice", label: t.typeQuiz, tone: "neutral" as const },
];
const who = [
  { value: "all", label: t.forAll, tone: "neutral" as const },
  { value: "selected", label: t.forSome, tone: "neutral" as const },
];
const backTo = computed(() =>
  id.value ? `/assignments/${id.value}` : `/courses/${courseId.value}?tab=homework`,
);
const hint = computed(() =>
  v.type === "speaking" ? t.speakingHint : v.type === "essay" ? t.essayHint : t.quizHint,
);
const err = f.form.errors;
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
        <div class="flex flex-col gap-2">
          <p class="fieldset-legend">{{ t.kind }}</p>
          <AppSegmented
            v-model="v.type"
            :options="kinds"
            :label="t.kind"
            :class="{ 'pointer-events-none opacity-60': f.kindLocked.value }"
          />
          <p v-if="f.kindLocked.value" class="text-sm text-base-content/60">{{ t.kindLocked }}</p>
          <p v-else class="text-sm text-base-content/60">{{ hint }}</p>
        </div>
        <AppInput v-model="v.title" :label="t.name" :error="err.title" />
        <AppTextarea v-model="v.instructions" :label="t.instructions" :rows="5" :error="err.instructions" />
      </AppCard>

      <AppCard v-if="v.type === 'multiple_choice'" :title="t.questions">
        <AppAlert v-if="err.questions" kind="error">{{ err.questions }}</AppAlert>
        <div
          v-for="(q, qi) in v.questions"
          :key="qi"
          class="flex flex-col gap-3 rounded-box border border-base-300 p-4"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium">{{ t.questionN.replace("{n}", String(qi + 1)) }}</p>
            <AppButton v-if="v.questions.length > 1" variant="ghost" compact @click="f.removeQuestion(qi)">{{
              t.removeQuestion
            }}</AppButton>
          </div>
          <AppInput v-model="q.text" :label="t.questionText" />
          <div v-for="(_, oi) in q.options" :key="oi" class="flex items-end gap-2">
            <div class="flex-1">
              <AppInput v-model="q.options[oi]!" :label="t.answerN.replace('{n}', String(oi + 1))" />
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
          <div>
            <AppButton v-if="q.options.length < 6" variant="ghost" compact @click="f.addOption(qi)"
              ><AppIcon name="plus" :size="16" />{{ t.addAnswer }}</AppButton
            >
          </div>
        </div>
        <div>
          <AppButton variant="secondary" @click="f.addQuestion"
            ><AppIcon name="plus" :size="18" />{{ t.addQuestion }}</AppButton
          >
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
        <div class="grid gap-x-4 gap-y-3 md:grid-cols-3">
          <AppInput v-model="v.dueDate" :label="t.dueDate" type="date" :error="err.dueDate" />
          <AppInput v-model="v.dueTime" :label="t.dueTime" type="time" :error="err.dueTime" />
          <AppInput v-model="v.maxScore" :label="t.maxScore" inputmode="numeric" :error="err.maxScore" />
          <p class="text-sm text-base-content/60 md:col-span-3">{{ t.dueHint }}</p>
          <div class="md:col-span-3"><AppCheckbox v-model="v.allowLate" :label="t.allowLate" /></div>
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
        <AppButton variant="ghost" @click="router.push(backTo)">{{ messages.common.cancel }}</AppButton>
      </div>
    </form>
  </AppPage>
</template>
