<script setup lang="ts">
import AppIcon, { type IconName } from "./AppIcon.vue";
defineProps<{ icon: IconName; title: string; text?: string }>();
</script>

<template>
  <div class="flex flex-col items-center gap-3 px-4 py-10 text-center">
    <span class="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
      <AppIcon :name="icon" :size="28" />
    </span>
    <h3 class="text-lg font-semibold">{{ title }}</h3>
    <p v-if="text" class="max-w-sm text-base-content/60">{{ text }}</p>
    <div class="mt-1 flex flex-wrap justify-center gap-2"><slot /></div>
  </div>
</template>
