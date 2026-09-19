<script setup lang="ts">
import { computed, ref } from "vue";
import { describeEnroll } from "@/features/enrollments/describe";
import { useAddStudents, useRoster } from "@/features/enrollments/useRoster";
import { formatVnd } from "@/features/format";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppProgress from "@/ui/AppProgress.vue";

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
const statusTone = { active: "success", completed: "info", dropped: "neutral", pending: "warning" } as const;
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
  <div class="flex flex-col gap-6">
    <AppCard :title="t.title" :description="seats" flush>
      <div v-if="maxStudents !== null" class="px-5 pt-4">
        <AppProgress :value="roster.activeCount.value" :max="maxStudents" :label="t.title" />
      </div>
      <AppAlert v-if="roster.error.value" kind="error" class="m-5">{{ roster.error.value }}</AppAlert>
      <div v-if="roster.loading.value" class="p-5"><AppLoading :label="messages.common.loading" /></div>
      <AppEmpty
        v-else-if="roster.students.value.length === 0"
        icon="users"
        :title="t.empty"
        :text="t.emptyText"
      />
      <ul v-else class="divide-y divide-base-300">
        <li v-for="s in roster.students.value" :key="s.studentId" class="flex flex-col gap-3 px-5 py-4">
          <div class="flex flex-wrap items-center gap-3">
            <AppAvatar :name="s.studentName" />
            <div class="min-w-0 flex-1 basis-40">
              <AppLink :to="`/students/${s.studentId}`">{{ s.studentName }}</AppLink>
              <p class="text-sm text-base-content/60">
                {{
                  s.customPrice === null
                    ? `${t.coursePrice}: ${formatVnd(pricePerLesson)}`
                    : `${t.ownPrice}: ${formatVnd(s.customPrice)}`
                }}
              </p>
            </div>
            <AppBadge :tone="statusTone[s.status]">{{ statusText[s.status] }}</AppBadge>
            <AppBadge v-if="s.studentArchived">{{ t.archivedStudent }}</AppBadge>
            <div class="flex flex-wrap gap-1">
              <AppButton variant="ghost" compact @click="startEdit(s.studentId, s.customPrice)">{{
                t.changePrice
              }}</AppButton>
              <template v-if="s.status === 'active'">
                <AppButton
                  variant="ghost"
                  compact
                  @click="roster.setStatus(s.studentId, 'completed', s.customPrice)"
                  >{{ t.finish }}</AppButton
                >
                <AppButton
                  variant="ghost"
                  compact
                  @click="roster.setStatus(s.studentId, 'dropped', s.customPrice)"
                  >{{ t.remove }}</AppButton
                >
              </template>
              <AppButton
                v-else
                variant="ghost"
                compact
                @click="roster.setStatus(s.studentId, 'active', s.customPrice)"
                >{{ t.addBack }}</AppButton
              >
            </div>
          </div>
          <div
            v-if="editing === s.studentId"
            class="flex flex-wrap items-end gap-2 rounded-field bg-base-200 p-3"
          >
            <AppInput v-model="priceText" :label="t.price" inputmode="numeric" :hint="t.useCoursePrice" />
            <AppButton @click="savePrice(s.studentId, s.status === 'pending' ? 'active' : s.status)">{{
              t.savePrice
            }}</AppButton>
          </div>
        </li>
      </ul>
    </AppCard>

    <AppCard :title="t.addTitle">
      <AppAlert v-if="add.error.value" kind="error">{{ add.error.value }}</AppAlert>
      <AppAlert v-if="summary" :kind="add.lastResult.value?.enrolled ? 'success' : 'info'">{{
        summary
      }}</AppAlert>
      <AppInput v-model="add.search.value" :label="t.search" />
      <p v-if="add.shown.value.length === 0" class="text-base-content/60">
        {{ t.nothingToAdd }} <AppLink to="/students">{{ t.goToStudents }}</AppLink>
      </p>
      <template v-else>
        <div>
          <AppButton variant="ghost" compact @click="add.selectAllShown">{{ t.selectAll }}</AppButton>
        </div>
        <ul class="flex flex-col gap-1">
          <li v-for="s in add.shown.value" :key="s.id" class="flex min-h-11 items-center gap-3">
            <input
              :id="`pick-${s.id}`"
              type="checkbox"
              class="checkbox checkbox-primary"
              :checked="add.selected.value.has(s.id)"
              @change="add.toggle(s.id)"
            />
            <label :for="`pick-${s.id}`" class="flex flex-1 cursor-pointer items-center gap-3 text-sm">
              <AppAvatar :name="s.name" size="sm" />
              <span
                >{{ s.name }} <span class="text-base-content/60">({{ s.email }})</span></span
              >
            </label>
          </li>
        </ul>
        <AppInput v-model="add.price.value" :label="t.ownPriceLabel" inputmode="numeric" />
        <div>
          <AppButton :disabled="add.selected.value.size === 0" :loading="add.busy.value" @click="add.add">
            {{ fill(t.addSelected, { n: add.selected.value.size }) }}
          </AppButton>
        </div>
      </template>
    </AppCard>
  </div>
</template>
