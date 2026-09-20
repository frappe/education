<script setup lang="ts">
import { signUpBody } from "@lms/shared";
import { ref } from "vue";
import DevEmailHint from "@/components/DevEmailHint.vue";
import GoogleButton from "@/components/GoogleButton.vue";
import { authApi } from "@/features/auth/api";
import { useSignInOptions } from "@/features/auth/google";
import { useForm } from "@/features/forms/useForm";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAuthPage from "@/ui/AppAuthPage.vue";
import AppButton from "@/ui/AppButton.vue";
import AppDivider from "@/ui/AppDivider.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppTurnstile from "@/ui/AppTurnstile.vue";

const t = messages.signUp;
const c = messages.common;
const { google: googleOn, emailLink: emailOn, none } = useSignInOptions();
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
  <AppAuthPage :title="t.title" :subtitle="done ? undefined : t.intro">
    <template v-if="done">
      <div class="flex flex-col items-center gap-3 py-2 text-center">
        <span class="grid size-14 place-items-center rounded-full bg-success/15 text-success">
          <AppIcon name="mail" :size="28" />
        </span>
        <h2 class="text-lg font-semibold">{{ t.doneTitle }}</h2>
        <p class="text-base-content/70">{{ t.doneBody }}</p>
      </div>
      <DevEmailHint />
    </template>
    <template v-else>
      <AppAlert v-if="none" kind="warning">{{ messages.google.unavailable }}</AppAlert>
      <template v-if="googleOn">
        <GoogleButton intent="sign-up" />
        <AppDivider v-if="emailOn">{{ t.orEmail }}</AppDivider>
      </template>
      <form v-if="emailOn" class="flex flex-col gap-4" novalidate @submit.prevent="form.submit">
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
        <AppButton type="submit" :loading="form.submitting.value" block>{{ t.submit }}</AppButton>
      </form>
    </template>
    <template #below>
      {{ t.hasAccount }} <AppLink to="/sign-in">{{ messages.glossary.signIn }}</AppLink>
    </template>
  </AppAuthPage>
</template>
