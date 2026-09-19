<script setup lang="ts">
defineProps<{ to: string }>();
</script>

<template>
  <RouterLink :to="to" class="text-[var(--color-primary)] underline underline-offset-2">
    <slot />
  </RouterLink>
</template>
