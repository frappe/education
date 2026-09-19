<script setup lang="ts">
import { computed, ref } from "vue";
import { describeEnroll } from "@/features/enrollments/describe";
import { useAddStudents, useRoster } from "@/features/enrollments/useRoster";
import { formatVnd } from "@/features/format";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";

const props = defineProps<{ courseId: string; pricePerLesson: number; maxStudents: number | null }>();
const emit = defineEmits<{ changed: [] }>();
const t = messages.roster;

const roster = useRoster(props.courseId, () => emit("changed"));
const add = useAddStudents(
  props.courseId,
  () => roster.students.value,
  () => {
    void roster.load();
    emit("changed");
  },
);

const statusText = {
  active: t.statusActive,
  completed: t.statusCompleted,
  dropped: t.statusDropped,
  pending: t.statusActive,
} as const;
const seats = computed(() =>
  props.maxStudents === null
    ? fill(t.seatsNoLimit, { n: roster.activeCount.value })
    : fill(t.seats, { n: roster.activeCount.value, max: props.maxStudents }),
);
const summary = computed(() => (add.lastResult.value ? describeEnroll(add.lastResult.value, t) : ""));

// Changing one student's own price
const editing = ref<string | null>(null);
const priceText = ref("");
function startEdit(id: string, current: number | null) {
  editing.value = id;
  priceText.value = current === null ? "" : String(current);
}
async function savePrice(id: string, status: "active" | "completed" | "dropped") {
  const text = priceText.value.trim();
  if (text !== "" && !/^\d+$/.test(text)) return;
  await roster.setStatus(id, status, text === "" ? null : Number(text));
  editing.value = null;
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h2 class="text-lg font-medium">{{ t.title }}</h2>
    <p class="text-sm text-[var(--color-text-muted)]">{{ seats }}</p>
    <AppAlert v-if="roster.error.value" kind="error">{{ roster.error.value }}</AppAlert>
    <p v-if="roster.loading.value">{{ messages.common.loading }}</p>
    <p v-else-if="roster.students.value.length === 0" class="text-[var(--color-text-muted)]">{{ t.empty }}</p>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="s in roster.students.value"
        :key="s.studentId"
        class="flex flex-col gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <AppLink :to="`/students/${s.studentId}`">{{ s.studentName }}</AppLink>
          <span class="text-sm text-[var(--color-text-muted)]">
            {{ statusText[s.status] }}<template v-if="s.studentArchived"> · {{ t.archivedStudent }}</template>
          </span>
        </div>
        <p class="text-sm text-[var(--color-text-muted)]">
          {{
            s.customPrice === null
              ? `${t.coursePrice}: ${formatVnd(pricePerLesson)}`
              : `${t.ownPrice}: ${formatVnd(s.customPrice)}`
          }}
        </p>
        <div v-if="editing === s.studentId" class="flex flex-wrap items-end gap-2">
          <AppInput v-model="priceText" :label="t.price" inputmode="numeric" :hint="t.useCoursePrice" />
          <AppButton @click="savePrice(s.studentId, s.status === 'pending' ? 'active' : s.status)">{{
            t.savePrice
          }}</AppButton>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton variant="secondary" @click="startEdit(s.studentId, s.customPrice)">{{
            t.changePrice
          }}</AppButton>
          <template v-if="s.status === 'active'">
            <AppButton
              variant="secondary"
              @click="roster.setStatus(s.studentId, 'completed', s.customPrice)"
              >{{ t.finish }}</AppButton
            >
            <AppButton variant="secondary" @click="roster.setStatus(s.studentId, 'dropped', s.customPrice)">{{
              t.remove
            }}</AppButton>
          </template>
          <AppButton
            v-else
            variant="secondary"
            @click="roster.setStatus(s.studentId, 'active', s.customPrice)"
            >{{ t.addBack }}</AppButton
          >
        </div>
      </li>
    </ul>

    <h3 class="font-medium">{{ t.addTitle }}</h3>
    <AppAlert v-if="add.error.value" kind="error">{{ add.error.value }}</AppAlert>
    <AppAlert v-if="summary" :kind="add.lastResult.value?.enrolled ? 'success' : 'info'">{{
      summary
    }}</AppAlert>
    <AppInput v-model="add.search.value" :label="t.search" />
    <p v-if="add.shown.value.length === 0" class="text-[var(--color-text-muted)]">
      {{ t.nothingToAdd }} <AppLink to="/students">{{ t.goToStudents }}</AppLink>
    </p>
    <template v-else>
      <AppButton variant="secondary" @click="add.selectAllShown">{{ t.selectAll }}</AppButton>
      <ul class="flex flex-col gap-1">
        <li v-for="s in add.shown.value" :key="s.id" class="flex items-center gap-2">
          <input
            :id="`pick-${s.id}`"
            type="checkbox"
            class="h-5 w-5"
            :checked="add.selected.value.has(s.id)"
            @change="add.toggle(s.id)"
          />
          <label :for="`pick-${s.id}`" class="text-sm"
            >{{ s.name }} <span class="text-[var(--color-text-muted)]">({{ s.email }})</span></label
          >
        </li>
      </ul>
      <AppInput v-model="add.price.value" :label="t.ownPriceLabel" inputmode="numeric" />
      <AppButton :disabled="add.selected.value.size === 0" :loading="add.busy.value" @click="add.add">
        {{ fill(t.addSelected, { n: add.selected.value.size }) }}
      </AppButton>
    </template>
  </section>
</template>
