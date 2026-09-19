<script setup lang="ts">
// Short messages that fade away ("Saved."). The list comes from the toast store.
defineProps<{ items: { id: number; kind: "success" | "error" | "info"; text: string }[] }>();
</script>

<template>
  <div class="toast toast-end toast-bottom z-50" aria-live="polite">
    <div
      v-for="t in items"
      :key="t.id"
      class="alert"
      :class="{
        'alert-success': t.kind === 'success',
        'alert-error': t.kind === 'error',
        'alert-info': t.kind === 'info',
      }"
      role="status"
    >
      <span>{{ t.text }}</span>
    </div>
  </div>
</template>
