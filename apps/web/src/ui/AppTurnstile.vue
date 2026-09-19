<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Cloudflare Turnstile bot check. With no site key (local development) it shows nothing
 * and the server accepts the request. In staging and production the server requires it.
 */
interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const token = defineModel<string>({ default: "" });
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const el = ref<HTMLElement>();
let widgetId: string | undefined;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
}

onMounted(async () => {
  if (!siteKey || !el.value) return;
  await loadScript();
  widgetId = window.turnstile?.render(el.value, {
    sitekey: siteKey,
    callback: (t: string) => (token.value = t),
    "expired-callback": () => (token.value = ""),
    "error-callback": () => (token.value = ""),
  });
});

onBeforeUnmount(() => {
  if (widgetId) window.turnstile?.remove(widgetId);
});

/** A check can be used once, so call this after every send. */
function reset() {
  token.value = "";
  if (widgetId) window.turnstile?.reset(widgetId);
}
defineExpose({ reset });
</script>

<template>
  <div v-if="siteKey" ref="el" />
</template>
