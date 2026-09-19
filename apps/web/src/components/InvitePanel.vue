<script setup lang="ts">
import { ref } from "vue";
import { useInvites } from "@/features/invites/useInvites";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppInput from "@/ui/AppInput.vue";

const t = messages.invites;
const justSent = ref(false);
const { invites, loading, actionError, form, resend, cancel } = useInvites(() => (justSent.value = true));

const stateText = { sent: t.stateSent, expired: t.stateExpired, revoked: t.stateRevoked } as const;
</script>

<template>
  <section class="flex flex-col gap-4">
    <h2 class="text-lg font-medium">{{ t.title }}</h2>
    <form
      class="flex flex-col gap-3"
      novalidate
      @submit.prevent="
        justSent = false;
        form.submit();
      "
    >
      <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
      <AppAlert v-if="justSent" kind="success">{{ t.sent }}</AppAlert>
      <AppInput v-model="form.values.name" :label="t.name" :error="form.errors.value.name" />
      <AppInput v-model="form.values.email" :label="t.email" type="email" :error="form.errors.value.email" />
      <AppButton type="submit" :loading="form.submitting.value">{{ t.submit }}</AppButton>
    </form>

    <h3 class="font-medium">{{ t.listTitle }}</h3>
    <AppAlert v-if="actionError" kind="error">{{ actionError }}</AppAlert>
    <p v-if="loading">{{ messages.common.loading }}</p>
    <p v-else-if="invites.length === 0" class="text-[var(--color-text-muted)]">{{ t.empty }}</p>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="invite in invites"
        :key="invite.studentId"
        class="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
      >
        <div>
          <p class="font-medium">{{ invite.name }}</p>
          <p class="text-sm text-[var(--color-text-muted)]">
            {{ invite.email }} · {{ stateText[invite.state] }}
          </p>
        </div>
        <div class="flex gap-2">
          <AppButton variant="secondary" @click="resend(invite.studentId)">{{ t.resend }}</AppButton>
          <AppButton
            v-if="invite.state !== 'revoked'"
            variant="secondary"
            @click="cancel(invite.studentId)"
            >{{ t.cancel }}</AppButton
          >
        </div>
      </li>
    </ul>
  </section>
</template>
