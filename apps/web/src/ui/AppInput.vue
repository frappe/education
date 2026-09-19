<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  disabled?: boolean;
  label: string;
  type?: "text" | "email" | "number" | "date" | "time" | "tel" | "url";
  autocomplete?: string;
  error?: string;
  hint?: string;
  inputmode?: "text" | "numeric" | "decimal" | "tel";
  placeholder?: string;
}>();
const model = defineModel<string>({ default: "" });
const id = useId();
</script>

<template>
  <div class="fieldset gap-1 py-0">
    <label :for="id" class="fieldset-legend">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="input min-h-11 w-full"
      :class="{ 'input-error': error }"
    />
    <p v-if="hint && !error" :id="`${id}-hint`" class="label whitespace-normal">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" role="alert" class="label whitespace-normal text-error">
      {{ error }}
    </p>
  </div>
</template>
