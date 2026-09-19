<script setup lang="ts">
import { password as passwordRule } from "@lms/shared";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { z } from "zod";
import { ApiError } from "@/api/client";
import { authApi } from "@/features/auth/api";
import { useForm } from "@/features/forms/useForm";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.reset;
const route = useRoute();
const token = computed(() => String(route.query.token ?? ""));
const done = ref(false);
const expired = ref(false);

const form = useForm(
  { password: "" },
  {
    schema: z.object({ password: passwordRule }),
    submit: async (v) => {
      try {
        await authApi.resetPassword(token.value, v.password);
        done.value = true;
      } catch (err) {
        if (err instanceof ApiError && err.code === "LINK_EXPIRED") expired.value = true;
        else throw err;
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
      <AppLink to="/sign-in">{{ messages.glossary.signIn }}</AppLink>
    </template>
    <template v-else-if="expired || !token">
      <AppAlert kind="error">{{ t.expired }}</AppAlert>
      <AppLink to="/forgot-password">{{ t.askAgain }}</AppLink>
    </template>
    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="form.submit">
      <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
      <AppInput
        v-model="form.values.password"
        :label="messages.common.newPassword"
        type="password"
        autocomplete="new-password"
        :hint="messages.signUp.passwordHint"
        :error="form.errors.value.password"
      />
      <AppButton type="submit" :loading="form.submitting.value">{{ t.submit }}</AppButton>
    </form>
  </AppPage>
</template>
