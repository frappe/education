<script setup lang="ts">
withDefaults(defineProps<{ kind?: "error" | "success" | "info" }>(), { kind: "info" });
</script>

<template>
  <div
    :role="kind === 'error' ? 'alert' : 'status'"
    class="rounded-[var(--radius-control)] border p-3 text-sm"
    :class="{
      'border-[var(--color-danger)] text-[var(--color-danger)]': kind === 'error',
      'border-[var(--color-success)] text-[var(--color-success)]': kind === 'success',
      'border-[var(--color-border)] text-[var(--color-text)]': kind === 'info',
    }"
  >
    <slot />
  </div>
</template>
