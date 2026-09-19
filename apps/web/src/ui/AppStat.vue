<script setup lang="ts">
import AppIcon, { type IconName } from "./AppIcon.vue";
defineProps<{
  value: string | number;
  label: string;
  icon: IconName;
  tone?: "primary" | "secondary" | "accent";
}>();
</script>

<template>
  <div class="flex items-center gap-4 rounded-box border border-base-300 bg-base-100 p-4">
    <span
      class="grid size-12 shrink-0 place-items-center rounded-field"
      :class="{
        'bg-primary/10 text-primary': !tone || tone === 'primary',
        'bg-secondary/15 text-secondary': tone === 'secondary',
        'bg-accent/20 text-accent-content': tone === 'accent',
      }"
    >
      <AppIcon :name="icon" :size="24" />
    </span>
    <div>
      <p class="text-2xl font-semibold leading-tight">{{ value }}</p>
      <p class="text-sm text-base-content/60">{{ label }}</p>
    </div>
  </div>
</template>
