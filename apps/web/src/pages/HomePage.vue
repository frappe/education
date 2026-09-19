<script setup lang="ts">
import { onMounted } from "vue";
import { useHealth } from "@/features/health/useHealth";
import { messages } from "@/messages";
import AppButton from "@/ui/AppButton.vue";

const { state, check } = useHealth();
const text = messages.home;
onMounted(check);
</script>

<template>
  <main class="mx-auto max-w-xl p-4">
    <h1 class="text-2xl font-semibold">{{ text.title }}</h1>
    <p class="mt-2 text-[var(--color-text-muted)]">{{ text.intro }}</p>

    <section
      class="mt-6 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      aria-live="polite"
    >
      <h2 class="font-medium">{{ text.statusTitle }}</h2>
      <p v-if="state === 'checking'" class="mt-1">{{ text.statusChecking }}</p>
      <p v-else-if="state === 'ok'" class="mt-1 text-[var(--color-success)]">{{ text.statusOk }}</p>
      <p v-else class="mt-1 text-[var(--color-danger)]">{{ text.statusProblem }}</p>
      <AppButton class="mt-3" :disabled="state === 'checking'" @click="check">{{ text.retry }}</AppButton>
    </section>
  </main>
</template>
