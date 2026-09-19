<script setup lang="ts">
defineProps<{ value: number; max: number; label: string }>();
</script>

<template>
  <progress class="progress progress-primary h-2 w-full" :value="value" :max="max" :aria-label="label" />
</template>
