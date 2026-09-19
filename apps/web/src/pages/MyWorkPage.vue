<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { typeText } from "@/components/homeworkLabels";
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
import { useRoute } from "vue-router";

const t = messages.my;
const route = useRoute();
const id = String(route.params.id);
const m = useMyWork(id, { handedIn: t.handedIn });
const w = computed(() => m.work.value);
const confirming = ref(false);
// The link box works with text; an empty box means "no link".
const linkModel = computed({
  get: () => m.answer.linkUrl ?? "",
  set: (v: string) => (m.answer.linkUrl = v),
});

async function handIn() {
  confirming.value = false;
  await m.handIn();
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
const statusLine = computed(() => {
  switch (w.value?.status) {
    case "submitted":
    case "graded":
      return t.statusSubmitted;
    case "returned":
      return t.statusReturned;
    default:
      return "";
  }
});
const choose = (q: number, o: number) => {
  m.answer.answers[q] = o;
  m.changed();
};
</script>

<template>
  <AppPage
    :title="w?.title ?? t.coursesTitle"
    :subtitle="w ? `${w.courseName} · ${typeText[w.type]}` : undefined"
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
      <AppCard v-if="w.status === 'returned'" :title="t.yourScore">
        <p class="text-3xl font-semibold text-primary">{{ scoreText(w.score, w.maxScore) }}</p>
        <div v-if="w.feedback">
          <p class="text-sm text-base-content/60">{{ t.teacherWords }}</p>
          <p class="whitespace-pre-wrap break-words">{{ w.feedback }}</p>
        </div>
      </AppCard>
      <AppAlert v-else-if="statusLine" kind="success"
        >{{ statusLine }}
        <span v-if="w.submittedAt" class="opacity-70">({{ formatWhen(w.submittedAt) }})</span></AppAlert
      >
      <AppAlert v-if="w.blocked === 'closed'" kind="info">{{ t.blockedClosed }}</AppAlert>
      <AppAlert v-else-if="w.blocked === 'deadline'" kind="warning">{{ t.blockedDeadline }}</AppAlert>

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

      <AppCard :title="w.canEdit ? t.writeAnswer : t.your">
        <AppAlert v-if="m.error.value" kind="error">{{ m.error.value }}</AppAlert>

        <template v-if="w.type === 'multiple_choice'">
          <fieldset
            v-for="(q, qi) in w.questions"
            :key="qi"
            class="flex flex-col gap-2"
            :disabled="!w.canEdit"
          >
            <legend class="font-medium">{{ qi + 1 }}. {{ q.text }}</legend>
            <label
              v-for="(o, oi) in q.options"
              :key="oi"
              class="flex min-h-11 cursor-pointer items-center gap-3 rounded-field border px-3 py-2"
              :class="m.answer.answers[qi] === oi ? 'border-primary bg-primary/10' : 'border-base-300'"
            >
              <input
                type="radio"
                class="radio radio-primary"
                :name="`q-${qi}`"
                :checked="m.answer.answers[qi] === oi"
                @change="choose(qi, oi)"
              />
              <span>{{ o }}</span>
            </label>
          </fieldset>
        </template>

        <template v-else-if="w.type === 'speaking'">
          <AppInput
            v-model="linkModel"
            :label="t.videoLink"
            type="url"
            placeholder="https://"
            :hint="t.videoHint"
            :disabled="!w.canEdit"
            @update:model-value="m.changed()"
          />
          <AppTextarea
            v-model="m.answer.textAnswer"
            :label="t.videoNote"
            :rows="3"
            :disabled="!w.canEdit"
            @update:model-value="m.changed()"
          />
        </template>

        <template v-else>
          <AppTextarea
            v-model="m.answer.textAnswer"
            :label="t.writeAnswer"
            :rows="10"
            :disabled="!w.canEdit"
            @update:model-value="m.changed()"
          />
          <AppInput
            v-model="linkModel"
            :label="t.docLink"
            type="url"
            placeholder="https://"
            :hint="t.docHint"
            :disabled="!w.canEdit"
            @update:model-value="m.changed()"
          />
        </template>

        <div
          v-if="w.canEdit"
          class="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-4"
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
      </AppCard>
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
