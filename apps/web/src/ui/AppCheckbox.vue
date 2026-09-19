<script setup lang="ts">
import { useId } from "vue";

defineProps<{ label: string }>();
const model = defineModel<boolean>({ default: false });
const id = useId();
</script>

<template>
  <div class="flex min-h-11 items-center gap-3">
    <input :id="id" v-model="model" type="checkbox" class="checkbox checkbox-primary" />
    <label :for="id" class="cursor-pointer text-sm">{{ label }}</label>
  </div>
</template>
