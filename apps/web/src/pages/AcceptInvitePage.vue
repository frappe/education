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
import AppAuthPage from "@/ui/AppAuthPage.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppDivider from "@/ui/AppDivider.vue";

// This page only shows buttons. The link is used up when the person presses one, not when the
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
  <AppAuthPage :title="t.title" :subtitle="action.expired.value || !token ? undefined : t.intro">
    <template v-if="action.expired.value || !token">
      <AppAlert kind="error">{{ t.expired }}</AppAlert>
    </template>
    <template v-else>
      <AppAlert v-if="problem" kind="error">{{ problem }}</AppAlert>
      <AppAlert v-if="action.error.value" kind="error">{{ action.error.value }}</AppAlert>
      <template v-if="googleOn">
        <GoogleButton intent="invite" :invite="token" :keep="trust" />
        <p class="-mt-2 text-center text-sm text-base-content/60">{{ t.googleHint }}</p>
        <AppDivider>{{ t.orEmail }}</AppDivider>
      </template>
      <AppButton
        block
        :variant="googleOn ? 'secondary' : 'primary'"
        :loading="action.busy.value"
        @click="action.run"
        >{{ t.submit }}</AppButton
      >
      <AppCheckbox v-model="trust" :label="messages.common.trustDevice" />
    </template>
  </AppAuthPage>
</template>
