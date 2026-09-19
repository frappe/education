<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import GoogleButton from "@/components/GoogleButton.vue";
import { authApi } from "@/features/auth/api";
import { errorFromAddress, useGoogleAvailable } from "@/features/auth/google";
import { useSession } from "@/features/auth/session";
import { useOneClick } from "@/features/auth/useOneClick";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";

// This page only shows a button. The link is used up when the person presses it, not when the
// page opens, so an email scanner that visits the link cannot use it up.
const t = messages.invite;
const route = useRoute();
const router = useRouter();
const session = useSession();
const token = computed(() => String(route.query.token ?? ""));
const trust = ref(true);
const googleOn = useGoogleAvailable();
const problem = errorFromAddress(route.query.error);

const action = useOneClick(async () => {
  await authApi.acceptInvite(token.value, trust.value);
  await session.load(true);
  await router.replace("/");
});
</script>

<template>
  <AppPage :title="t.title" narrow>
    <template v-if="action.expired.value || !token">
      <AppAlert kind="error">{{ t.expired }}</AppAlert>
    </template>
    <template v-else>
      <p>{{ t.intro }}</p>
      <AppAlert v-if="problem" kind="error">{{ problem }}</AppAlert>
      <AppAlert v-if="action.error.value" kind="error">{{ action.error.value }}</AppAlert>
      <AppCheckbox v-model="trust" :label="messages.common.trustDevice" />
      <template v-if="googleOn">
        <p class="text-sm">{{ t.googleHint }}</p>
        <GoogleButton intent="invite" :invite="token" :keep="trust" />
        <p class="text-sm text-[var(--color-text-muted)]">{{ t.orEmail }}</p>
      </template>
      <AppButton :loading="action.busy.value" @click="action.run">{{ t.submit }}</AppButton>
    </template>
  </AppPage>
</template>
