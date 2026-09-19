<script setup lang="ts">
defineProps<{ title?: string; description?: string; flush?: boolean }>();
</script>

<template>
  <section class="min-w-0 rounded-box border border-base-300 bg-base-100">
    <header
      v-if="title || $slots.actions"
      class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 px-5 py-4"
    >
      <div>
        <h2 class="font-semibold">{{ title }}</h2>
        <p v-if="description" class="text-sm text-base-content/60">{{ description }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="flush ? '' : 'flex flex-col gap-4 p-5'"><slot /></div>
  </section>
</template>
