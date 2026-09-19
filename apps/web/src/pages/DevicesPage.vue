<script setup lang="ts">
import type { SessionInfo } from "@lms/shared";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { authApi } from "@/features/auth/api";
import { useSession } from "@/features/auth/session";
import { useToast } from "@/features/toast/useToast";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.devices;
const router = useRouter();
const session = useSession();
const toast = useToast();
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
    } else {
      await load();
      toast.success(t.ended);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : messages.common.somethingWrong;
  }
}

async function endAll() {
  await authApi.signOutEverywhere();
  await session.load(true);
  await router.replace("/");
}

// A rough guess of the kind of device, only to pick an icon.
const isPhone = (ua: string | null) => /iphone|android|mobile/i.test(ua ?? "");
const when = (iso: string) => new Date(iso).toLocaleString();
onMounted(load);
</script>

<template>
  <AppPage :title="t.title" :subtitle="t.intro">
    <template #actions>
      <AppButton variant="danger" compact @click="endAll"
        ><AppIcon name="sign-out" :size="16" />{{ t.signOutAll }}</AppButton
      >
    </template>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppLoading v-if="loading" :label="messages.common.loading" />
    <AppCard v-else-if="sessions.length === 0"><AppEmpty icon="devices" :title="t.empty" /></AppCard>
    <AppCard v-else flush>
      <ul class="divide-y divide-base-300">
        <li v-for="s in sessions" :key="s.id" class="flex flex-wrap items-center gap-4 px-5 py-4">
          <span class="grid size-11 place-items-center rounded-field bg-base-200 text-base-content/70">
            <AppIcon :name="isPhone(s.userAgent) ? 'mobile' : 'devices'" :size="22" />
          </span>
          <div class="min-w-0 flex-1 basis-56">
            <p class="truncate font-medium">{{ s.userAgent ?? "-" }}</p>
            <p class="text-sm text-base-content/60">{{ t.lastUsed }}: {{ when(s.lastSeenAt) }}</p>
          </div>
          <AppBadge v-if="s.current" tone="success">{{ t.thisDevice }}</AppBadge>
          <AppButton variant="secondary" compact @click="end(s)">{{ t.signOut }}</AppButton>
        </li>
      </ul>
    </AppCard>
  </AppPage>
</template>
