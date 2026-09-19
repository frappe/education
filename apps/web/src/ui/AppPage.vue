<script setup lang="ts">
import AppIcon from "./AppIcon.vue";

// Page frame: a heading with an optional short text, a way back, and actions on the right.
defineProps<{ title: string; subtitle?: string; narrow?: boolean; backTo?: string; backLabel?: string }>();
</script>

<template>
  <main class="mx-auto w-full px-4 py-6 md:px-8 md:py-8" :class="narrow ? 'max-w-md' : 'max-w-6xl'">
    <RouterLink
      v-if="backTo"
      :to="backTo"
      class="mb-3 inline-flex min-h-8 items-center gap-1 text-sm text-base-content/60 hover:text-base-content"
    >
      <AppIcon name="back" :size="16" />{{ backLabel }}
    </RouterLink>
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-base-content/60">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </header>
    <div class="flex flex-col gap-6"><slot /></div>
  </main>
</template>
