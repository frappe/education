<script setup lang="ts">
import { computed } from "vue";
import { describeEnroll } from "@/features/enrollments/describe";
import { useStudentCourses } from "@/features/enrollments/useStudentCourses";
import { formatVnd } from "@/features/format";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppLink from "@/ui/AppLink.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppSelect from "@/ui/AppSelect.vue";

const props = defineProps<{ studentId: string; archived: boolean }>();
const t = messages.studentCourses;
const r = messages.roster;
const { courses, available, chosen, loading, busy, error, result, add } = useStudentCourses(props.studentId);

const statusText = {
  active: r.statusActive,
  completed: r.statusCompleted,
  dropped: r.statusDropped,
  pending: r.statusActive,
} as const;
const statusTone = { active: "success", completed: "info", dropped: "neutral", pending: "warning" } as const;
const options = computed(() => available.value.map((c) => ({ value: c.id, label: c.name })));
const summary = computed(() => (result.value ? describeEnroll(result.value, r) : ""));
</script>

<template>
  <AppCard :title="t.title" flush>
    <AppAlert v-if="error" kind="error" class="m-5">{{ error }}</AppAlert>
    <div v-if="loading" class="p-5"><AppLoading :label="messages.common.loading" :rows="2" /></div>
    <AppEmpty v-else-if="courses.length === 0" icon="book" :title="t.empty" />
    <ul v-else class="divide-y divide-base-300">
      <li v-for="c in courses" :key="c.courseId" class="flex items-center gap-3 px-5 py-3">
        <div class="min-w-0 flex-1">
          <AppLink :to="`/courses/${c.courseId}`">{{ c.courseName }}</AppLink>
          <p class="text-sm text-base-content/60">
            {{
              c.customPrice === null
                ? `${t.coursePrice}: ${formatVnd(c.pricePerLesson)}`
                : `${t.ownPrice}: ${formatVnd(c.customPrice)}`
            }}
          </p>
        </div>
        <AppBadge :tone="statusTone[c.status]">{{ statusText[c.status] }}</AppBadge>
      </li>
    </ul>

    <div v-if="!archived && !loading" class="flex flex-col gap-3 border-t border-base-300 p-5">
      <AppAlert v-if="summary" :kind="result?.enrolled ? 'success' : 'info'">{{ summary }}</AppAlert>
      <p v-if="options.length === 0" class="text-sm text-base-content/60">{{ t.none }}</p>
      <div v-else class="flex flex-wrap items-end gap-3">
        <div class="min-w-48 flex-1">
          <AppSelect v-model="chosen" :label="t.add" :options="options" :placeholder="t.choose" />
        </div>
        <AppButton :disabled="!chosen" :loading="busy" @click="add">{{ t.addButton }}</AppButton>
      </div>
    </div>
  </AppCard>
</template>
