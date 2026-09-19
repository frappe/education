<script setup lang="ts">
import { useId } from "vue";

defineProps<{ label: string; error?: string; hint?: string; rows?: number }>();
const model = defineModel<string>({ default: "" });
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1">
    <label :for="id" class="text-sm font-medium">{{ label }}</label>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows ?? 4"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="rounded-[var(--radius-control)] border bg-[var(--color-surface)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]"
      :class="error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'"
    />
    <p v-if="hint && !error" :id="`${id}-hint`" class="text-sm text-[var(--color-text-muted)]">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" role="alert" class="text-sm text-[var(--color-danger)]">
      {{ error }}
    </p>
  </div>
</template>
