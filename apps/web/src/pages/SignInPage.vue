<script setup lang="ts">
import { emailOnlyBody } from "@lms/shared";
import { ref } from "vue";
import { useRoute } from "vue-router";
import DevEmailHint from "@/components/DevEmailHint.vue";
import GoogleButton from "@/components/GoogleButton.vue";
import { authApi } from "@/features/auth/api";
import { errorFromAddress, useSignInOptions } from "@/features/auth/google";
import { useForm } from "@/features/forms/useForm";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAuthPage from "@/ui/AppAuthPage.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppDivider from "@/ui/AppDivider.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppTurnstile from "@/ui/AppTurnstile.vue";

const t = messages.signIn;
const route = useRoute();
const { google: googleOn, emailLink: emailOn, none } = useSignInOptions();
const keep = ref(true);
const problem = errorFromAddress(route.query.error);
const done = ref(false);
const captcha = ref("");
const turnstile = ref<InstanceType<typeof AppTurnstile>>();

const form = useForm(
  { email: "" },
  {
    schema: emailOnlyBody,
    submit: async (v) => {
      try {
        await authApi.requestSignInLink(v.email, captcha.value || undefined);
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
      <AppAlert v-if="problem" kind="error">{{ problem }}</AppAlert>
      <AppAlert v-if="none" kind="warning">{{ messages.google.unavailable }}</AppAlert>
      <template v-if="googleOn">
        <GoogleButton intent="sign-in" :keep="keep" />
        <p class="-mt-2 text-center text-sm text-base-content/60">{{ t.students }}</p>
        <AppDivider v-if="emailOn">{{ messages.google.or }}</AppDivider>
      </template>
      <form v-if="emailOn" class="flex flex-col gap-4" novalidate @submit.prevent="form.submit">
        <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
        <AppInput
          v-model="form.values.email"
          :label="messages.common.email"
          type="email"
          autocomplete="email"
          :error="form.errors.value.email"
        />
        <AppTurnstile ref="turnstile" v-model="captcha" />
        <AppButton type="submit" :loading="form.submitting.value" block>{{ t.submit }}</AppButton>
      </form>
      <AppCheckbox v-if="googleOn" v-model="keep" :label="messages.common.trustDevice" />
    </template>
    <template #below>
      {{ t.noAccount }} <AppLink to="/sign-up">{{ messages.home.createAccount }}</AppLink>
    </template>
  </AppAuthPage>
</template>
