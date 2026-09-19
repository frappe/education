<script setup lang="ts">
defineProps<{ items: { key: string; label: string }[]; label: string }>();
const active = defineModel<string>({ required: true });
</script>

<template>
  <div role="tablist" :aria-label="label" class="tabs tabs-border">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      role="tab"
      class="tab min-h-11"
      :class="{ 'tab-active': active === item.key }"
      :aria-selected="active === item.key"
      @click="active = item.key"
    >
      {{ item.label }}
    </button>
  </div>
</template>
