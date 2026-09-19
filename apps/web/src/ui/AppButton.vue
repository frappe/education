<script setup lang="ts">
// The ONLY place that decides how a button looks. Pages use <AppButton>, never raw styles.
withDefaults(
  defineProps<{
    type?: "button" | "submit";
    /** primary: the main action of the page (use once). secondary: the normal button. */
    variant?: "primary" | "secondary" | "danger" | "ghost" | "link";
    disabled?: boolean;
    loading?: boolean;
    /** A smaller button for use inside lists and tables. */
    compact?: boolean;
    /** Fill the width of its container. */
    block?: boolean;
  }>(),
  { type: "button", variant: "primary" },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="btn gap-2 font-medium"
    :class="{
      'btn-primary': variant === 'primary',
      'btn-error': variant === 'danger',
      'btn-ghost': variant === 'ghost',
      'btn-link': variant === 'link',
      'btn-sm': compact,
      'min-h-11': !compact /* 44px: easy to touch */,
      'w-full': block,
    }"
  >
    <span v-if="loading" class="loading loading-spinner loading-sm" aria-hidden="true" />
    <slot />
  </button>
</template>
