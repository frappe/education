<script setup lang="ts">
import { lessonLabel } from "@/features/lessons/status";
import { computed } from "vue";
import InvitePanel from "@/components/InvitePanel.vue";
import { useSession } from "@/features/auth/session";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { formatDayLong, formatDayShort, formatVnd, today } from "@/features/format";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppStat from "@/ui/AppStat.vue";
import { useRouter } from "vue-router";

const t = messages.dashboard;
const session = useSession();
const router = useRouter();
const { courses, studentTotal, week, queue, receipts, loading, error } = useDashboard();

const firstName = computed(() => session.me?.user.name.split(" ")[0] ?? "");
const steps = computed(() => [
  {
    title: t.step1,
    text: t.step1Text,
    done: courses.value.length > 0,
    to: "/courses/new",
    icon: "book" as const,
  },
  {
    title: t.step2,
    text: t.step2Text,
    done: studentTotal.value > 0,
    to: "/students",
    icon: "users" as const,
  },
  {
    title: t.step3,
    text: t.step3Text,
    done: week.value.length > 0,
    to: "/courses",
    icon: "calendar" as const,
  },
]);
/** What needs attention about fee receipts, one line each. Empty when there is nothing to do. */
const receiptLines = computed(() => {
  const r = receipts.value;
  if (!r) return [];
  const lines: { text: string; to: string }[] = [];
  if (r.toCharge > 0)
    lines.push({
      text: r.toCharge === 1 ? t.receiptsToChargeOne : fill(t.receiptsToCharge, { n: r.toCharge }),
      to: "/invoices/new",
    });
  if (r.drafts > 0)
    lines.push({
      text: r.drafts === 1 ? t.receiptsDraftsOne : fill(t.receiptsDrafts, { n: r.drafts }),
      to: "/invoices",
    });
  if (r.unpaid > 0) {
    const amount = formatVnd(r.unpaidAmount);
    lines.push({
      text:
        r.unpaid === 1
          ? fill(t.receiptsUnpaidOne, { amount })
          : fill(t.receiptsUnpaid, { n: r.unpaid, amount }),
      to: "/invoices",
    });
  }
  return lines;
});
const showStart = computed(() => !loading.value && steps.value.some((s) => !s.done));
const upcoming = computed(() => week.value.filter((l) => l.status !== "cancelled").slice(0, 6));
const statusTone = {
  scheduled: "info",
  held: "success",
  cancelled: "neutral",
  needs_attendance: "warning",
} as const;
const statusText = {
  scheduled: messages.lessons.statusScheduled,
  held: messages.lessons.statusHeld,
  cancelled: messages.lessons.statusCancelled,
  needs_attendance: messages.lessons.statusNeeds,
} as const;
</script>

<template>
  <AppPage :title="fill(t.hello, { name: firstName })" :subtitle="`${formatDayLong(today())}. ${t.today}`">
    <AppAlert v-if="!session.me?.user.emailVerified" kind="warning">{{ messages.home.unconfirmed }}</AppAlert>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>

    <div class="grid gap-4 sm:grid-cols-3">
      <AppStat :value="courses.length" :label="t.courses" icon="book" />
      <AppStat :value="studentTotal" :label="t.students" icon="users" tone="secondary" />
      <AppStat :value="week.length" :label="t.lessonsWeek" icon="calendar" tone="accent" />
    </div>

    <AppCard v-if="showStart" :title="t.startTitle" :description="t.startText">
      <ol class="grid gap-3 md:grid-cols-3">
        <li
          v-for="(step, i) in steps"
          :key="step.title"
          class="flex flex-col gap-3 rounded-box border border-base-300 p-4"
        >
          <div class="flex items-center gap-3">
            <span
              class="grid size-9 place-items-center rounded-full"
              :class="step.done ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'"
            >
              <AppIcon :name="step.done ? 'check' : step.icon" :size="18" />
            </span>
            <span class="text-sm text-base-content/60">{{ i + 1 }}</span>
          </div>
          <div class="flex-1">
            <p class="font-medium">{{ step.title }}</p>
            <p class="text-sm text-base-content/60">{{ step.text }}</p>
          </div>
          <AppBadge v-if="step.done" tone="success">{{ t.stepDone }}</AppBadge>
          <AppButton v-else compact variant="secondary" @click="router.push(step.to)">{{
            t.stepGo
          }}</AppButton>
        </li>
      </ol>
    </AppCard>

    <AppCard v-if="!loading && receiptLines.length" :title="t.receiptsTitle" flush>
      <ul class="divide-y divide-base-300">
        <li v-for="l in receiptLines" :key="l.text">
          <RouterLink :to="l.to" class="flex items-center gap-3 px-5 py-3 hover:bg-base-200/60">
            <AppIcon name="invoice" :size="18" />
            <span class="flex-1">{{ l.text }}</span>
            <AppIcon name="right" :size="16" />
          </RouterLink>
        </li>
      </ul>
    </AppCard>

    <AppCard v-if="!loading && queue.length" :title="messages.queue.title" flush>
      <ul class="divide-y divide-base-300">
        <li v-for="q in queue.slice(0, 6)" :key="`${q.assignmentId}-${q.studentId}`">
          <RouterLink
            :to="`/assignments/${q.assignmentId}/students/${q.studentId}`"
            class="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-base-200/60"
          >
            <AppAvatar :name="q.studentName" size="sm" />
            <span class="min-w-0 flex-1 basis-48">
              <span class="block truncate font-medium">{{ q.studentName }}</span>
              <span class="block truncate text-sm text-base-content/60"
                >{{ q.assignmentTitle }} · {{ q.courseName }}</span
              >
            </span>
            <AppBadge v-if="q.isLate" tone="error">{{ messages.queue.late }}</AppBadge>
            <AppBadge tone="warning">{{ messages.queue.open }}</AppBadge>
          </RouterLink>
        </li>
      </ul>
    </AppCard>

    <div class="grid min-w-0 gap-6 lg:grid-cols-5">
      <AppCard class="lg:col-span-3" :title="t.weekTitle" flush>
        <template #actions>
          <AppButton variant="ghost" compact @click="router.push('/schedule')">{{ t.seeSchedule }}</AppButton>
        </template>
        <div v-if="loading" class="p-5"><AppLoading :label="messages.common.loading" /></div>
        <AppEmpty
          v-else-if="upcoming.length === 0"
          icon="calendar"
          :title="t.weekEmpty"
          :text="t.weekEmptyText"
        />
        <ul v-else class="divide-y divide-base-300">
          <li v-for="l in upcoming" :key="l.id">
            <RouterLink
              :to="`/lessons/${l.id}/attendance`"
              class="flex items-center gap-4 px-5 py-3 hover:bg-base-200/60"
            >
              <span
                class="grid w-14 shrink-0 place-items-center rounded-field bg-primary/10 py-1.5 text-primary"
              >
                <span class="text-xs font-medium uppercase">{{ formatDayShort(l.date).split(" ")[0] }}</span>
                <span class="text-lg font-semibold leading-tight">{{ l.date.slice(8) }}</span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ l.title || l.courseName }}</span>
                <span class="block truncate text-sm text-base-content/60">
                  {{ l.startTime }} - {{ l.endTime }} · {{ l.courseName }}
                </span>
              </span>
              <AppBadge :tone="statusTone[lessonLabel(l)]">{{ statusText[lessonLabel(l)] }}</AppBadge>
            </RouterLink>
          </li>
        </ul>
      </AppCard>
      <div class="min-w-0 lg:col-span-2"><InvitePanel /></div>
    </div>
  </AppPage>
</template>
