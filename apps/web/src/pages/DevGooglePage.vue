<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { devGoogleCode } from "@/features/auth/google";
import { isLocalHost } from "@/features/health/isLocalHost";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAuthPage from "@/ui/AppAuthPage.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";

// A stand-in for the Google page, only on the developer's own computer.
const t = messages.devGoogle;
const route = useRoute();
const local = isLocalHost(window.location.hostname);
const state = computed(() => encodeURIComponent(String(route.query.state ?? "")));
const email = ref("");
const name = ref("");

const back = (params: string) =>
  window.location.assign(`/api/auth/google/callback?${params}&state=${state.value}`);
const signIn = () => back(`code=${devGoogleCode(email.value.trim(), name.value.trim())}`);
const cancel = () => back("error=access_denied");
</script>

<template>
  <AppAuthPage :title="t.title" :subtitle="local ? t.intro : undefined">
    <AppAlert v-if="!local" kind="info">{{ t.notAvailable }}</AppAlert>
    <form v-else class="flex flex-col gap-4" @submit.prevent="signIn">
      <AppInput v-model="email" :label="t.email" type="email" />
      <AppInput v-model="name" :label="t.name" />
      <AppButton type="submit" block>{{ t.submit }}</AppButton>
      <AppButton variant="ghost" block @click="cancel">{{ t.cancel }}</AppButton>
    </form>
  </AppAuthPage>
</template>
