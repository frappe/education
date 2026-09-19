<script setup lang="ts">
import { isLocalHost } from "@/features/health/isLocalHost";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppLink from "@/ui/AppLink.vue";

// Shown only on the developer's own computer, where emails are not really sent.
const show = isLocalHost(window.location.hostname);
const t = messages.devOutbox;
</script>

<template>
  <AppAlert v-if="show" kind="info">
    <p>{{ t.hint }}</p>
    <AppLink to="/dev/outbox">{{ t.hintLink }}</AppLink>
  </AppAlert>
</template>
