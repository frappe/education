<script setup lang="ts">
withDefaults(defineProps<{ tone?: "neutral" | "success" | "warning" | "error" | "info" }>(), {
  tone: "neutral",
});
</script>

<template>
  <span
    class="badge badge-soft"
    :class="{
      'badge-success': tone === 'success',
      'badge-warning': tone === 'warning',
      'badge-error': tone === 'error',
      'badge-info': tone === 'info',
    }"
  >
    <slot />
  </span>
</template>
