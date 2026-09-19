<script setup lang="ts">
// A quiet placeholder while data loads: three grey bars where the content will be.
defineProps<{ label: string; rows?: number }>();
</script>

<template>
  <div role="status" :aria-label="label" class="flex flex-col gap-3">
    <div v-for="n in rows ?? 3" :key="n" class="skeleton h-14 w-full" />
    <span class="sr-only">{{ label }}</span>
  </div>
</template>
