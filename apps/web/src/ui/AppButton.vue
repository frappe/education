<script setup lang="ts">
// The ONLY place that decides how a button looks. Pages use <AppButton>, never raw styles.
defineProps<{ disabled?: boolean }>();
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="inline-flex items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 font-medium text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
    style="min-height: var(--tap-size)"
  >
    <slot />
  </button>
</template>
