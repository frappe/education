<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
withDefaults(defineProps<{ kind?: "error" | "success" | "info" | "warning" }>(), { kind: "info" });
</script>

<template>
  <div
    :role="kind === 'error' ? 'alert' : 'status'"
    class="alert alert-soft items-start"
    :class="{
      'alert-error': kind === 'error',
      'alert-success': kind === 'success',
      'alert-info': kind === 'info',
      'alert-warning': kind === 'warning',
    }"
  >
    <AppIcon
      :name="
        kind === 'error' ? 'alert' : kind === 'success' ? 'done' : kind === 'warning' ? 'warning' : 'info'
      "
      :size="18"
    />
    <div class="text-sm"><slot /></div>
  </div>
</template>
