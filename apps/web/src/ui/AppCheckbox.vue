<script setup lang="ts">
import { useId } from "vue";

defineProps<{ label: string }>();
const model = defineModel<boolean>({ default: false });
const id = useId();
</script>

<template>
  <div class="flex items-start gap-2">
    <input :id="id" v-model="model" type="checkbox" class="mt-1 h-5 w-5" />
    <label :for="id" class="text-sm">{{ label }}</label>
  </div>
</template>
