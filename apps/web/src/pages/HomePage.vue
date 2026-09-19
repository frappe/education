<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import InvitePanel from "@/components/InvitePanel.vue";
import { useSession } from "@/features/auth/session";
import { useHealth } from "@/features/health/useHealth";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.home;
const session = useSession();
const router = useRouter();
const { state, check } = useHealth();
onMounted(check);

async function signOut() {
  await session.signOut();
  await router.replace("/");
}
</script>

<template>
  <AppPage v-if="session.me" :title="`${t.hello} ${session.me.user.name}`">
    <AppAlert v-if="!session.me.user.emailVerified" kind="info">{{ t.unconfirmed }}</AppAlert>
    <InvitePanel v-if="session.isTeacher" />
    <p v-else>{{ t.studentHome }}</p>
    <div class="flex flex-wrap gap-4">
      <AppLink to="/devices">{{ t.devices }}</AppLink>
      <button type="button" class="text-[var(--color-primary)] underline underline-offset-2" @click="signOut">
        {{ t.signOut }}
      </button>
    </div>
  </AppPage>

  <AppPage v-else :title="t.title">
    <p>{{ t.intro }}</p>
    <div class="flex flex-wrap gap-3">
      <AppButton @click="router.push('/sign-in')">{{ t.signIn }}</AppButton>
      <AppButton variant="secondary" @click="router.push('/sign-up')">{{ t.createAccount }}</AppButton>
    </div>
    <section aria-live="polite">
      <h2 class="font-medium">{{ t.statusTitle }}</h2>
      <p v-if="state === 'checking'">{{ t.statusChecking }}</p>
      <p v-else-if="state === 'ok'" class="text-[var(--color-success)]">{{ t.statusOk }}</p>
      <p v-else class="text-[var(--color-danger)]">{{ t.statusProblem }}</p>
      <AppButton class="mt-2" variant="secondary" :disabled="state === 'checking'" @click="check">{{
        t.retry
      }}</AppButton>
    </section>
  </AppPage>
</template>
