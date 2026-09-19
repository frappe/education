<script setup lang="ts">
import { googleStartUrl, useGoogleAvailable, type GoogleIntent } from "@/features/auth/google";
import { messages } from "@/messages";
import AppButton from "@/ui/AppButton.vue";

const props = defineProps<{ intent: GoogleIntent; invite?: string; keep?: boolean }>();
const available = useGoogleAvailable();

// A full page visit: the server sends the browser to Google, and Google sends it back.
const go = () => window.location.assign(googleStartUrl(props));
</script>

<template>
  <AppButton v-if="available" variant="secondary" @click="go">{{ messages.google.continue }}</AppButton>
</template>
