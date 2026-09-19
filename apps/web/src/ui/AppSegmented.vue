<script setup lang="ts">
// A small choice between a few options, shown as joined buttons (for example Attended / Absent).
defineProps<{
  options: { value: string; label: string; tone: "success" | "error" | "neutral" }[];
  label: string;
}>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <div class="join" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="btn join-item btn-sm min-h-9 px-4"
      :class="
        model === o.value
          ? {
              'btn-success': o.tone === 'success',
              'btn-error': o.tone === 'error',
              'btn-neutral': o.tone === 'neutral',
            }
          : 'btn-ghost border-base-300'
      "
      :aria-pressed="model === o.value"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
