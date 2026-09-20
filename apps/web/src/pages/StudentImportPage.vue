<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { fill } from "@/features/text";
import { downloadSampleStudents } from "@/features/students/sample";
import { useCsvImport } from "@/features/students/useStudents";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTable from "@/ui/AppTable.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.importStudents;
const router = useRouter();
const imp = useCsvImport();

const problemText = computed(() =>
  imp.problem.value === "empty"
    ? t.problemEmpty
    : imp.problem.value === "no_email_column"
      ? t.problemNoEmail
      : imp.problem.value === "too_many"
        ? t.problemTooMany
        : null,
);
const okCount = computed(() => imp.result.value?.rows.filter((r) => r.result === "new").length ?? 0);
const skipped = computed(() => (imp.result.value?.rows.length ?? 0) - okCount.value);
const resultText = {
  new: t.rowNew,
  exists: t.rowExists,
  duplicate_in_list: t.rowDuplicate,
  invalid: t.rowInvalid,
} as const;
const resultTone = {
  new: "success",
  exists: "neutral",
  duplicate_in_list: "warning",
  invalid: "error",
} as const;

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void imp.readFile(file);
}
const steps = computed(() => ({ input: 1, preview: 2, done: 3 })[imp.step.value]);
</script>

<template>
  <AppPage :title="t.title" back-to="/students" :back-label="messages.common.back">
    <ul class="steps w-full" :aria-label="t.stepsLabel">
      <li class="step" :class="{ 'step-primary': steps >= 1 }">{{ t.step1 }}</li>
      <li class="step" :class="{ 'step-primary': steps >= 2 }">{{ t.step2 }}</li>
      <li class="step" :class="{ 'step-primary': steps >= 3 }">{{ t.step3 }}</li>
    </ul>

    <AppCard v-if="imp.step.value === 'input'">
      <p class="text-base-content/70">{{ t.intro }}</p>
      <ol class="list-decimal space-y-1 pl-5 text-base-content/70">
        <li>{{ t.howTo1 }}</li>
        <li>{{ t.howTo2 }}</li>
        <li>{{ t.howTo3 }}</li>
      </ol>
      <div>
        <AppButton variant="secondary" @click="downloadSampleStudents"
          ><AppIcon name="download" :size="18" />{{ t.sample }}</AppButton
        >
      </div>
      <AppAlert v-if="problemText" kind="error">{{ problemText }}</AppAlert>
      <AppAlert v-if="imp.error.value" kind="error">{{ imp.error.value }}</AppAlert>
      <div class="fieldset">
        <label class="fieldset-legend" for="import-file">{{ t.file }}</label>
        <input
          id="import-file"
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          class="file-input w-full"
          @change="onFile"
        />
      </div>
      <AppTextarea v-model="imp.text.value" :label="t.paste" :hint="t.pasteHint" :rows="6" />
      <div>
        <AppButton :loading="imp.busy.value" @click="imp.check"
          ><AppIcon name="check" :size="18" />{{ t.check }}</AppButton
        >
      </div>
    </AppCard>

    <AppCard
      v-else-if="imp.step.value === 'preview' && imp.result.value"
      :title="t.previewTitle"
      :description="fill(t.summary, { ok: okCount, skipped })"
      flush
    >
      <AppAlert v-if="imp.error.value" kind="error" class="m-5">{{ imp.error.value }}</AppAlert>
      <AppTable>
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t.colName }}</th>
            <th>{{ t.colEmail }}</th>
            <th>{{ t.colResult }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in imp.result.value.rows" :key="r.row">
            <td class="text-base-content/60">{{ r.row }}</td>
            <td>{{ imp.rows.value[r.row - 1]?.name || "-" }}</td>
            <td>{{ imp.rows.value[r.row - 1]?.email || "-" }}</td>
            <td>
              <AppBadge :tone="resultTone[r.result]">{{ resultText[r.result] }}</AppBadge>
              <span v-if="r.message && r.result === 'invalid'" class="ml-2 text-sm text-base-content/60">{{
                r.message
              }}</span>
            </td>
          </tr>
        </tbody>
      </AppTable>
      <div class="flex flex-wrap items-center gap-3 border-t border-base-300 p-5">
        <p v-if="okCount === 0" class="flex-1 text-base-content/70">{{ t.nothingNew }}</p>
        <AppButton v-if="okCount > 0" :loading="imp.busy.value" @click="imp.confirm">{{
          fill(t.confirm, { n: okCount })
        }}</AppButton>
        <AppButton variant="secondary" @click="imp.reset">{{ t.back }}</AppButton>
      </div>
    </AppCard>

    <AppCard v-else :title="t.doneTitle">
      <AppAlert kind="success">{{ fill(t.doneBody, { n: imp.result.value?.created ?? 0 }) }}</AppAlert>
      <div class="flex flex-wrap gap-3">
        <AppButton @click="router.push('/students')">{{ t.goToStudents }}</AppButton>
        <AppButton variant="secondary" @click="imp.reset">{{ t.another }}</AppButton>
      </div>
    </AppCard>
  </AppPage>
</template>
