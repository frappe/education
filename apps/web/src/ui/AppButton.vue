<script setup lang="ts">
// The ONLY place that decides how a button looks. Pages use <AppButton>, never raw styles.
withDefaults(
  defineProps<{
    type?: "button" | "submit";
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { type: "button", variant: "primary" },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="inline-flex items-center justify-center rounded-[var(--radius-control)] border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
    :class="{
      'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-text)]': variant === 'primary',
      'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]':
        variant === 'secondary',
      'border-transparent bg-[var(--color-danger)] text-[var(--color-primary-text)]': variant === 'danger',
    }"
    style="min-height: var(--tap-size)"
  >
    <slot />
  </button>
</template>
