<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import LessonPicker from "@/components/LessonPicker.vue";
import { formatVnd } from "@/features/format";
import { useNewInvoice } from "@/features/invoices/useInvoices";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppSelect from "@/ui/AppSelect.vue";

const t = messages.invoices;
const router = useRouter();
const n = useNewInvoice((id) => router.push(`/invoices/${id}`));
const options = computed(() =>
  n.students.value.map((s) => ({
    value: s.studentId,
    label: `${s.name} · ${fill(t.studentLessons, { n: s.lessons })} · ${formatVnd(s.amount)}`,
  })),
);
</script>

<template>
  <AppPage :title="t.newTitle" :subtitle="t.newText" back-to="/invoices" :back-label="t.back">
    <AppAlert v-if="n.error.value" kind="error">{{ n.error.value }}</AppAlert>
    <AppLoading v-if="n.loading.value" :label="messages.common.loading" />
    <div v-else-if="n.students.value.length === 0" class="rounded-box border border-base-300 bg-base-100">
      <AppEmpty icon="invoice" :title="t.allBilled" :text="t.allBilledText" />
    </div>
    <template v-else>
      <AppCard>
        <AppSelect
          v-model="n.studentId.value"
          :label="t.chooseStudent"
          :options="options"
          :placeholder="t.chooseStudentHint"
        />
      </AppCard>
      <AppCard v-if="n.studentId.value" :title="t.chooseLessons" :description="t.chooseLessonsText">
        <AppLoading v-if="n.picker.loading.value" :label="messages.common.loading" />
        <LessonPicker
          v-else
          v-model="n.picker.chosen.value"
          :lessons="n.picker.lessons.value"
          :total="n.picker.total.value"
          @all="n.picker.tickAll"
          @none="n.picker.untick"
        />
        <div class="flex justify-end">
          <AppButton
            :loading="n.busy.value"
            :disabled="n.picker.chosen.value.length === 0"
            @click="n.create"
            >{{ t.createDraft }}</AppButton
          >
        </div>
      </AppCard>
    </template>
  </AppPage>
</template>
