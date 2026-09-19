<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authApi } from "@/features/auth/api";
import { useSession } from "@/features/auth/session";
import { useOneClick } from "@/features/auth/useOneClick";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAuthPage from "@/ui/AppAuthPage.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppLink from "@/ui/AppLink.vue";

// This page only shows a button. The link is used up when the person presses it, not when the
// page opens, so an email scanner that visits the link cannot use it up.
const t = messages.emailLink;
const route = useRoute();
const router = useRouter();
const session = useSession();
const token = computed(() => String(route.query.token ?? ""));
const trust = ref(true);

const action = useOneClick(async () => {
  await authApi.consumeSignInLink(token.value, trust.value);
  await session.load(true);
  await router.replace("/");
});
</script>

<template>
  <AppAuthPage
    :title="t.landingTitle"
    :subtitle="action.expired.value || !token ? undefined : t.landingIntro"
  >
    <template v-if="action.expired.value || !token">
      <AppAlert kind="error">{{ t.expired }}</AppAlert>
      <AppLink to="/sign-in">{{ t.askAgain }}</AppLink>
    </template>
    <template v-else>
      <AppAlert v-if="action.error.value" kind="error">{{ action.error.value }}</AppAlert>
      <AppCheckbox v-model="trust" :label="messages.common.trustDevice" />
      <AppButton :loading="action.busy.value" block @click="action.run">{{ t.landingSubmit }}</AppButton>
    </template>
  </AppAuthPage>
</template>
