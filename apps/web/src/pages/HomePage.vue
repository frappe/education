<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import GoogleButton from "@/components/GoogleButton.vue";
import StudentDashboard from "@/components/StudentDashboard.vue";
import TeacherDashboard from "@/components/TeacherDashboard.vue";
import { useSession } from "@/features/auth/session";
import { useHealth } from "@/features/health/useHealth";
import { messages } from "@/messages";
import AppButton from "@/ui/AppButton.vue";
import AppIcon, { type IconName } from "@/ui/AppIcon.vue";

const t = messages.landing;
const session = useSession();
const router = useRouter();
const { state, check } = useHealth();
onMounted(check);

const features: { icon: IconName; title: string; text: string }[] = [
  { icon: "users", title: t.f1Title, text: t.f1Text },
  { icon: "calendar", title: t.f2Title, text: t.f2Text },
  { icon: "attendance", title: t.f3Title, text: t.f3Text },
  { icon: "shield", title: t.f4Title, text: t.f4Text },
];
</script>

<template>
  <TeacherDashboard v-if="session.me && session.isTeacher" />

  <StudentDashboard v-else-if="session.me" />

  <div v-else>
    <section class="bg-linear-to-b from-primary/10 to-transparent">
      <div class="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center md:py-24">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-sm"
        >
          <AppIcon name="spark" :size="16" class="text-primary" />{{ t.badge }}
        </span>
        <h1 class="text-4xl font-semibold tracking-tight md:text-5xl">{{ t.title }}</h1>
        <p class="max-w-xl text-lg text-base-content/70">{{ t.text }}</p>
        <div class="flex w-full max-w-sm flex-col gap-3">
          <GoogleButton intent="sign-up" />
          <AppButton @click="router.push('/sign-up')">{{ t.start }}</AppButton>
          <AppButton variant="ghost" @click="router.push('/sign-in')">{{ t.haveAccount }}</AppButton>
        </div>
        <p class="text-sm text-base-content/60">{{ t.studentNote }}</p>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-16 md:px-8">
      <h2 class="mb-6 text-center text-2xl font-semibold tracking-tight">{{ t.featuresTitle }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="f in features"
          :key="f.title"
          class="rounded-box border border-base-300 bg-base-100 p-5"
        >
          <span class="mb-4 grid size-11 place-items-center rounded-field bg-primary/10 text-primary">
            <AppIcon :name="f.icon" :size="22" />
          </span>
          <h3 class="font-semibold">{{ f.title }}</h3>
          <p class="mt-1 text-sm text-base-content/60">{{ f.text }}</p>
        </article>
      </div>
      <p class="mt-10 flex items-center justify-center gap-2 text-sm text-base-content/60" aria-live="polite">
        <span
          class="size-2 rounded-full"
          :class="state === 'ok' ? 'bg-success' : state === 'checking' ? 'bg-base-300' : 'bg-error'"
        />
        {{
          state === "ok"
            ? messages.home.statusOk
            : state === "checking"
              ? messages.home.statusChecking
              : messages.home.statusProblem
        }}
      </p>
    </section>
  </div>
</template>
