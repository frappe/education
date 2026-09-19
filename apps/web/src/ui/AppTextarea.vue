<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  disabled?: boolean;
  /** Can be read and copied but not changed, and keeps the normal text color. */
  readonly?: boolean;
  label: string;
  error?: string;
  hint?: string;
  rows?: number;
}>();
const model = defineModel<string>({ default: "" });
const id = useId();
</script>

<template>
  <div class="fieldset gap-1 py-0">
    <label :for="id" class="fieldset-legend">{{ label }}</label>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows ?? 4"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="textarea w-full"
      :class="{ 'textarea-error': error }"
    />
    <p v-if="hint && !error" :id="`${id}-hint`" class="label whitespace-normal">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" role="alert" class="label whitespace-normal text-error">
      {{ error }}
    </p>
  </div>
</template>
