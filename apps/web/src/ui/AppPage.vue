<script setup lang="ts">
// Page frame: one centered column, the same on every screen.
defineProps<{ title: string; narrow?: boolean }>();
</script>

<template>
  <main class="mx-auto p-4" :class="narrow ? 'max-w-md' : 'max-w-2xl'">
    <h1 class="mb-4 text-2xl font-semibold">{{ title }}</h1>
    <div
      class="flex flex-col gap-4 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <slot />
    </div>
  </main>
</template>
