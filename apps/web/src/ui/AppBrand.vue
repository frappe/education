<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
defineProps<{ name: string }>();
</script>

<template>
  <span class="flex items-center gap-2.5">
    <span class="grid size-9 place-items-center rounded-field bg-primary text-primary-content">
      <AppIcon name="cap" :size="20" />
    </span>
    <span class="text-lg font-semibold tracking-tight">{{ name }}</span>
  </span>
</template>
