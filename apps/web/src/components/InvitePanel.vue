<script setup lang="ts">
import { ref } from "vue";
import { useInvites } from "@/features/invites/useInvites";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";

const t = messages.invites;
const justSent = ref(false);
const { invites, loading, actionError, form, resend, cancel } = useInvites(() => (justSent.value = true));

const stateText = { sent: t.stateSent, expired: t.stateExpired, revoked: t.stateRevoked } as const;
const stateTone = { sent: "info", expired: "warning", revoked: "neutral" } as const;
</script>

<template>
  <AppCard :title="t.title" :description="t.intro">
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

    <div v-if="invites.length > 0 || actionError" class="flex flex-col gap-3 border-t border-base-300 pt-4">
      <h3 class="text-sm font-semibold">{{ t.listTitle }}</h3>
      <AppAlert v-if="actionError" kind="error">{{ actionError }}</AppAlert>
      <ul class="flex flex-col gap-3">
        <li v-for="invite in invites" :key="invite.studentId" class="flex items-center gap-3">
          <AppAvatar :name="invite.name" size="sm" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ invite.name }}</p>
            <p class="truncate text-xs text-base-content/60">{{ invite.email }}</p>
          </div>
          <AppBadge :tone="stateTone[invite.state]">{{ stateText[invite.state] }}</AppBadge>
          <div class="flex shrink-0">
            <button
              type="button"
              class="btn btn-square btn-ghost btn-sm"
              :aria-label="t.resend"
              :title="t.resend"
              @click="resend(invite.studentId)"
            >
              <AppIcon name="send" :size="16" />
            </button>
            <button
              v-if="invite.state !== 'revoked'"
              type="button"
              class="btn btn-square btn-ghost btn-sm"
              :aria-label="t.cancel"
              :title="t.cancel"
              @click="cancel(invite.studentId)"
            >
              <AppIcon name="close" :size="16" />
            </button>
          </div>
        </li>
      </ul>
    </div>
    <p v-else-if="!loading" class="text-sm text-base-content/60">{{ t.empty }}</p>
  </AppCard>
</template>
