<script setup lang="ts">
import { computed } from "vue";
import { fill } from "@/features/text";
import { useCsvImport } from "@/features/students/useStudents";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.importStudents;
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

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void imp.readFile(file);
}
</script>

<template>
  <AppPage :title="t.title">
    <template v-if="imp.step.value === 'input'">
      <p>{{ t.intro }}</p>
      <AppAlert v-if="problemText" kind="error">{{ problemText }}</AppAlert>
      <AppAlert v-if="imp.error.value" kind="error">{{ imp.error.value }}</AppAlert>
      <label class="flex flex-col gap-1 text-sm font-medium">
        {{ t.file }}
        <input type="file" accept=".csv,.txt,text/csv,text/plain" @change="onFile" />
      </label>
      <AppTextarea v-model="imp.text.value" :label="t.paste" :rows="8" />
      <AppButton :loading="imp.busy.value" @click="imp.check">{{ t.check }}</AppButton>
    </template>

    <template v-else-if="imp.step.value === 'preview' && imp.result.value">
      <h2 class="font-medium">{{ t.previewTitle }}</h2>
      <p>{{ fill(t.summary, { ok: okCount, skipped }) }}</p>
      <AppAlert v-if="imp.error.value" kind="error">{{ imp.error.value }}</AppAlert>
      <ul class="flex flex-col gap-1">
        <li v-for="r in imp.result.value.rows" :key="r.row" class="text-sm">
          {{ r.row }}. {{ imp.rows.value[r.row - 1]?.name || "-" }} ({{
            imp.rows.value[r.row - 1]?.email || "-"
          }}) — <strong>{{ resultText[r.result] }}</strong
          ><template v-if="r.message && r.result === 'invalid'">: {{ r.message }}</template>
        </li>
      </ul>
      <p v-if="okCount === 0">{{ t.nothingNew }}</p>
      <div class="flex flex-wrap gap-3">
        <AppButton v-if="okCount > 0" :loading="imp.busy.value" @click="imp.confirm">{{
          fill(t.confirm, { n: okCount })
        }}</AppButton>
        <AppButton variant="secondary" @click="imp.reset">{{ t.back }}</AppButton>
      </div>
    </template>

    <template v-else>
      <h2 class="font-medium">{{ t.doneTitle }}</h2>
      <AppAlert kind="success">{{ fill(t.doneBody, { n: imp.result.value?.created ?? 0 }) }}</AppAlert>
      <div class="flex flex-wrap gap-3">
        <AppButton variant="secondary" @click="imp.reset">{{ t.another }}</AppButton>
      </div>
      <AppLink to="/students">{{ t.goToStudents }}</AppLink>
    </template>
    <AppLink v-if="imp.step.value !== 'done'" to="/students">{{ messages.common.back }}</AppLink>
  </AppPage>
</template>
