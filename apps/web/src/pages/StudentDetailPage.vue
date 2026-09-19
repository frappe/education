<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import StudentCourses from "@/components/StudentCourses.vue";
import { formatDayShort } from "@/features/format";
import { useStudentAttendance } from "@/features/lessons/useStudentAttendance";
import { useStudentDetail } from "@/features/students/useStudents";
import { useToast } from "@/features/toast/useToast";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppStat from "@/ui/AppStat.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.studentDetail;
const s = messages.students;
const a = messages.studentAttendance;
const route = useRoute();
const toast = useToast();
const id = String(route.params.id);
const { student, form, loading, notFound, setArchived, invite } = useStudentDetail(id);
const attendance = useStudentAttendance(id);

const accessText = { joined: s.joined, invited: s.invited, not_invited: s.notInvited } as const;
const accessTone = { joined: "success", invited: "info", not_invited: "neutral" } as const;
const canInvite = computed(
  () => student.value && !student.value.archived && student.value.access !== "joined",
);

async function save() {
  await form.submit();
  if (!form.formError.value && Object.keys(form.errors.value).length === 0) toast.success(t.saved);
}
async function sendInvite() {
  await invite();
  toast.success(t.inviteSent);
}
</script>

<template>
  <AppPage :title="student?.name ?? t.title" back-to="/students" :back-label="t.backToStudents">
    <template v-if="student" #actions>
      <AppBadge :tone="student.archived ? 'neutral' : accessTone[student.access]">
        {{ student.archived ? s.archived : accessText[student.access] }}
      </AppBadge>
      <AppButton v-if="canInvite" variant="secondary" compact @click="sendInvite"
        ><AppIcon name="send" :size="16" />{{ t.invite }}</AppButton
      >
      <AppButton v-if="!student.archived" variant="secondary" compact @click="setArchived(true)"
        ><AppIcon name="archive" :size="16" />{{ t.archive }}</AppButton
      >
      <AppButton v-else variant="secondary" compact @click="setArchived(false)"
        ><AppIcon name="restore" :size="16" />{{ t.restore }}</AppButton
      >
    </template>

    <AppLoading v-if="loading" :label="messages.common.loading" />
    <AppAlert v-else-if="notFound" kind="error">{{ t.notFound }}</AppAlert>
    <div v-else-if="student" class="grid gap-6 lg:grid-cols-5">
      <div class="flex flex-col gap-6 lg:col-span-3">
        <AppCard :title="t.profile">
          <div class="flex items-center gap-4">
            <AppAvatar :name="student.name" size="lg" />
            <div class="min-w-0">
              <p class="truncate text-lg font-semibold">{{ student.name }}</p>
              <p class="flex items-center gap-1 truncate text-sm text-base-content/60">
                <AppIcon name="mail" :size="14" />{{ student.email }}
              </p>
            </div>
          </div>
          <form class="flex flex-col gap-4" novalidate @submit.prevent="save">
            <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
            <AppInput v-model="form.values.name" :label="s.name" :error="form.errors.value.name" />
            <AppInput
              v-model="form.values.phone"
              :label="s.phone"
              type="tel"
              :error="form.errors.value.phone"
            />
            <AppTextarea
              v-model="form.values.teacherNote"
              :label="t.note"
              :hint="t.noteHint"
              :error="form.errors.value.teacherNote"
            />
            <div>
              <AppButton type="submit" :loading="form.submitting.value">{{ t.save }}</AppButton>
            </div>
          </form>
        </AppCard>
      </div>

      <div class="flex flex-col gap-6 lg:col-span-2">
        <StudentCourses :key="student.id" :student-id="student.id" :archived="student.archived" />
        <AppCard :title="a.title" flush>
          <div v-if="attendance.loading.value" class="p-5">
            <AppLoading :label="messages.common.loading" :rows="2" />
          </div>
          <AppEmpty
            v-else-if="!attendance.info.value || attendance.info.value.recent.length === 0"
            icon="attendance"
            :title="a.empty"
          />
          <template v-else>
            <div class="grid grid-cols-2 gap-3 p-5">
              <AppStat
                :value="attendance.info.value.attended"
                :label="a.attended"
                icon="done"
                tone="secondary"
              />
              <AppStat :value="attendance.info.value.absent" :label="a.absent" icon="ban" tone="accent" />
            </div>
            <ul class="divide-y divide-base-300 border-t border-base-300">
              <li
                v-for="r in attendance.info.value.recent.slice(0, 8)"
                :key="r.lessonId"
                class="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <span class="w-24 shrink-0 text-base-content/60">{{ formatDayShort(r.date) }}</span>
                <span class="min-w-0 flex-1 truncate">{{ r.title || r.courseName }}</span>
                <AppBadge :tone="r.status === 'attended' ? 'success' : 'error'">{{
                  r.status === "attended" ? a.attended : a.absent
                }}</AppBadge>
              </li>
            </ul>
          </template>
        </AppCard>
      </div>
    </div>
  </AppPage>
</template>
