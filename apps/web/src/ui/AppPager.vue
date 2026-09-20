<script setup lang="ts">
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppButton from "./AppButton.vue";

// "Previous", the page number and "Next" under a table or list. It shows only when there is more than one page.
// `plain` leaves out the line above and the space around it (for a grid of cards).
defineProps<{ pages: number; plain?: boolean }>();
const page = defineModel<number>("page", { required: true });
</script>

<template>
  <nav
    v-if="pages > 1"
    :aria-label="messages.common.pages"
    class="flex items-center justify-between gap-3"
    :class="plain ? '' : 'border-t border-base-300 px-5 py-3'"
  >
    <AppButton variant="ghost" compact :disabled="page <= 1" @click="page--">{{
      messages.common.previous
    }}</AppButton>
    <span class="text-sm text-base-content/60" aria-live="polite">{{
      fill(messages.common.pageOf, { page, pages })
    }}</span>
    <AppButton variant="ghost" compact :disabled="page >= pages" @click="page++">{{
      messages.common.next
    }}</AppButton>
  </nav>
</template>
