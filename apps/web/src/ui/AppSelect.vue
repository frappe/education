<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}>();
const model = defineModel<string>({ default: "" });
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1">
    <label :for="id" class="text-sm font-medium">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      :aria-invalid="error ? true : undefined"
      class="rounded-[var(--radius-control)] border bg-[var(--color-surface)] px-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]"
      :class="error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'"
      style="min-height: var(--tap-size)"
    >
      <option value="">{{ placeholder ?? "" }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <p v-if="error" role="alert" class="text-sm text-[var(--color-danger)]">{{ error }}</p>
  </div>
</template>
