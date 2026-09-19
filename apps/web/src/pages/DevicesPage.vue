<script setup lang="ts">
import type { SessionInfo } from "@lms/shared";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { authApi } from "@/features/auth/api";
import { useSession } from "@/features/auth/session";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.devices;
const router = useRouter();
const session = useSession();
const sessions = ref<SessionInfo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
  sessions.value = (await authApi.sessions()).sessions;
  loading.value = false;
}

async function end(s: SessionInfo) {
  error.value = null;
  try {
    await authApi.endSession(s.id);
    if (s.current) {
      await session.load(true);
      await router.replace("/");
    } else await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : messages.common.somethingWrong;
  }
}

async function endAll() {
  await authApi.signOutEverywhere();
  await session.load(true);
  await router.replace("/");
}

const when = (iso: string) => new Date(iso).toLocaleString();
onMounted(load);
</script>

<template>
  <AppPage :title="t.title">
    <p>{{ t.intro }}</p>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="loading">{{ messages.common.loading }}</p>
    <p v-else-if="sessions.length === 0">{{ t.empty }}</p>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="s in sessions"
        :key="s.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
      >
        <div>
          <p class="font-medium">
            {{ s.userAgent ?? "-" }}<span v-if="s.current"> · {{ t.thisDevice }}</span>
          </p>
          <p class="text-sm text-[var(--color-text-muted)]">{{ t.lastUsed }}: {{ when(s.lastSeenAt) }}</p>
        </div>
        <AppButton variant="secondary" @click="end(s)">{{ t.signOut }}</AppButton>
      </li>
    </ul>
    <AppButton variant="danger" @click="endAll">{{ t.signOutAll }}</AppButton>
    <AppLink to="/">{{ messages.common.back }}</AppLink>
  </AppPage>
</template>
