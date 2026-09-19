<script setup lang="ts">
import { emailOnlyBody } from "@lms/shared";
import { ref } from "vue";
import DevEmailHint from "@/components/DevEmailHint.vue";
import { authApi } from "@/features/auth/api";
import { useForm } from "@/features/forms/useForm";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTurnstile from "@/ui/AppTurnstile.vue";

const t = messages.signIn;
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
  <AppPage :title="t.title" narrow>
    <template v-if="done">
      <h2 class="font-medium">{{ t.doneTitle }}</h2>
      <p>{{ t.doneBody }}</p>
      <DevEmailHint />
    </template>
    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="form.submit">
      <p>{{ t.intro }}</p>
      <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
      <AppInput
        v-model="form.values.email"
        :label="messages.common.email"
        type="email"
        autocomplete="email"
        :error="form.errors.value.email"
      />
      <AppTurnstile ref="turnstile" v-model="captcha" />
      <AppButton type="submit" :loading="form.submitting.value">{{ t.submit }}</AppButton>
      <p class="text-sm">
        {{ t.noAccount }} <AppLink to="/sign-up">{{ messages.home.createAccount }}</AppLink>
      </p>
    </form>
  </AppPage>
</template>
