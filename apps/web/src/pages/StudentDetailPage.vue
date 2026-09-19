<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useStudentDetail } from "@/features/students/useStudents";
import { messages } from "@/messages";
import StudentCourses from "@/components/StudentCourses.vue";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.studentDetail;
const s = messages.students;
const route = useRoute();
const { student, form, loading, notFound, saved, setArchived, invite } = useStudentDetail(
  String(route.params.id),
);

const accessText = { joined: s.joined, invited: s.invited, not_invited: s.notInvited } as const;
const canInvite = computed(
  () => student.value && !student.value.archived && student.value.access !== "joined",
);
</script>

<template>
  <AppPage :title="student?.name ?? t.title">
    <p v-if="loading">{{ messages.common.loading }}</p>
    <AppAlert v-else-if="notFound" kind="error">{{ t.notFound }}</AppAlert>
    <template v-else-if="student">
      <p class="text-sm text-[var(--color-text-muted)]">
        {{ student.email }} · {{ t.access }}: {{ student.archived ? s.archived : accessText[student.access] }}
      </p>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="form.submit">
        <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
        <AppAlert v-if="saved" kind="success">{{ t.saved }}</AppAlert>
        <AppInput v-model="form.values.name" :label="s.name" :error="form.errors.value.name" />
        <AppInput v-model="form.values.phone" :label="s.phone" type="tel" :error="form.errors.value.phone" />
        <AppTextarea
          v-model="form.values.teacherNote"
          :label="t.note"
          :error="form.errors.value.teacherNote"
        />
        <div class="flex flex-wrap gap-3">
          <AppButton type="submit" :loading="form.submitting.value">{{ t.save }}</AppButton>
          <AppButton v-if="canInvite" variant="secondary" @click="invite">{{ t.invite }}</AppButton>
          <AppButton v-if="!student.archived" variant="secondary" @click="setArchived(true)">{{
            t.archive
          }}</AppButton>
          <AppButton v-else variant="secondary" @click="setArchived(false)">{{ t.restore }}</AppButton>
        </div>
      </form>
    </template>
    <StudentCourses v-if="student" :key="student.id" :student-id="student.id" :archived="student.archived" />
    <AppLink to="/students">{{ messages.common.back }}</AppLink>
  </AppPage>
</template>
