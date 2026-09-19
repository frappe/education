<script setup lang="ts">
import { signUpBody } from "@lms/shared";
import { ref } from "vue";
import GoogleButton from "@/components/GoogleButton.vue";
import DevEmailHint from "@/components/DevEmailHint.vue";
import { authApi } from "@/features/auth/api";
import { useGoogleAvailable } from "@/features/auth/google";
import { useForm } from "@/features/forms/useForm";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTurnstile from "@/ui/AppTurnstile.vue";

const t = messages.signUp;
const googleOn = useGoogleAvailable();
const c = messages.common;
const done = ref(false);
const captcha = ref("");
const turnstile = ref<InstanceType<typeof AppTurnstile>>();

const form = useForm(
  { name: "", email: "" },
  {
    schema: signUpBody,
    submit: async (v) => {
      try {
        await authApi.signUp({ ...v, captcha: captcha.value || undefined });
        done.value = true;
      } finally {
        turnstile.value?.reset();
      }
    },
  },
);
</script>

<template>
  <AppPage :title="t.title" narrow>
    <template v-if="done">
      <h2 class="font-medium">{{ t.doneTitle }}</h2>
      <p>{{ t.doneBody }}</p>
      <DevEmailHint />
    </template>
    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="form.submit">
      <p>{{ t.intro }}</p>
      <template v-if="googleOn">
        <GoogleButton intent="sign-up" />
        <p class="text-sm text-[var(--color-text-muted)]">{{ t.orEmail }}</p>
      </template>
      <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
      <AppInput
        v-model="form.values.name"
        :label="c.name"
        autocomplete="name"
        :error="form.errors.value.name"
      />
      <AppInput
        v-model="form.values.email"
        :label="c.email"
        type="email"
        autocomplete="email"
        :error="form.errors.value.email"
      />
      <AppTurnstile ref="turnstile" v-model="captcha" />
      <AppButton type="submit" :loading="form.submitting.value">{{ t.submit }}</AppButton>
      <p class="text-sm">
        {{ t.hasAccount }} <AppLink to="/sign-in">{{ messages.glossary.signIn }}</AppLink>
      </p>
    </form>
  </AppPage>
</template>
