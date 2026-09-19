<script setup lang="ts">
// The frame of the sign in, sign up and link pages: one card in the middle of a soft background.
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <main
    class="grid min-h-[calc(100vh-9rem)] place-items-center bg-linear-to-b from-primary/10 to-transparent px-4 py-10"
  >
    <div class="w-full max-w-md">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-2 text-base-content/60">{{ subtitle }}</p>
      </div>
      <div class="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm md:p-8">
        <div class="flex flex-col gap-5"><slot /></div>
      </div>
      <div class="mt-4 text-center text-sm text-base-content/60"><slot name="below" /></div>
    </div>
  </main>
</template>
