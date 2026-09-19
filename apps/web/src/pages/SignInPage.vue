<script setup lang="ts">
import { signInBody } from "@lms/shared";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authApi } from "@/features/auth/api";
import { safeNext } from "@/features/auth/guards";
import { useSession } from "@/features/auth/session";
import { useForm } from "@/features/forms/useForm";
import { messages } from "@/messages";
import DevEmailHint from "@/components/DevEmailHint.vue";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTurnstile from "@/ui/AppTurnstile.vue";

const t = messages.signIn;
const c = messages.common;
const route = useRoute();
const router = useRouter();
const session = useSession();
const captcha = ref("");
const turnstile = ref<InstanceType<typeof AppTurnstile>>();
const resent = ref(false);

const form = useForm(
  { email: "", password: "" },
  {
    schema: signInBody,
    submit: async (v) => {
      try {
        await authApi.signIn({ ...v, captcha: captcha.value || undefined });
      } catch (err) {
        turnstile.value?.reset();
        throw err;
      }
      await session.load(true);
      await router.replace(safeNext(route.query.next));
    },
  },
);

async function resend() {
  await authApi.resendVerification(form.values.email, captcha.value || undefined);
  turnstile.value?.reset();
  resent.value = true;
}
</script>

<template>
  <AppPage :title="t.title" narrow>
    <form class="flex flex-col gap-4" novalidate @submit.prevent="form.submit">
      <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
      <AppAlert v-if="form.errorCode.value === 'EMAIL_NOT_VERIFIED'" kind="info">
        <p>{{ t.notConfirmed }}</p>
        <button v-if="!resent" type="button" class="mt-1 underline" @click="resend">
          {{ t.sendConfirm }}
        </button>
        <p v-else>{{ t.confirmSent }}</p>
        <DevEmailHint />
      </AppAlert>
      <AppInput
        v-model="form.values.email"
        :label="c.email"
        type="email"
        autocomplete="username"
        :error="form.errors.value.email"
      />
      <AppInput
        v-model="form.values.password"
        :label="c.password"
        type="password"
        autocomplete="current-password"
        :error="form.errors.value.password"
      />
      <AppTurnstile ref="turnstile" v-model="captcha" />
      <AppButton type="submit" :loading="form.submitting.value">{{ t.submit }}</AppButton>
      <p class="text-sm">
        <AppLink to="/forgot-password">{{ t.forgot }}</AppLink>
      </p>
      <p class="text-sm">
        <AppLink to="/sign-in-link">{{ t.emailLink }}</AppLink>
      </p>
      <p class="text-sm">
        {{ t.noAccount }} <AppLink to="/sign-up">{{ messages.home.createAccount }}</AppLink>
      </p>
    </form>
  </AppPage>
</template>
