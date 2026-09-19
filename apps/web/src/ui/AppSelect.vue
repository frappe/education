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
  <div class="fieldset gap-1 py-0">
    <label :for="id" class="fieldset-legend">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      :aria-invalid="error ? true : undefined"
      class="select min-h-11 w-full"
      :class="{ 'select-error': error }"
    >
      <option value="">{{ placeholder ?? "" }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <p v-if="error" role="alert" class="label whitespace-normal text-error">{{ error }}</p>
  </div>
</template>
