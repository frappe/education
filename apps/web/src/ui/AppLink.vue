<script setup lang="ts">
defineProps<{ to: string }>();
</script>

<template>
  <RouterLink :to="to" class="link link-primary">
    <slot />
  </RouterLink>
</template>
