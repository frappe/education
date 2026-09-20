<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from "vue";
import AppIcon from "./AppIcon.vue";

// A drop-down where several choices can be ticked. `summary` is what the closed box says (the parent words it).
defineProps<{
  label: string;
  options: { value: string; label: string; hint?: string }[];
  placeholder: string;
  summary?: string;
  emptyText: string;
  disabled?: boolean;
}>();
const model = defineModel<string[]>({ default: () => [] });
const id = useId();
const open = ref(false);
const root = ref<HTMLElement>();

function toggle(value: string) {
  model.value = model.value.includes(value)
    ? model.value.filter((v) => v !== value)
    : [...model.value, value];
}
const outside = (e: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
};
const escape = (e: KeyboardEvent) => {
  if (e.key === "Escape" && open.value) {
    open.value = false;
    root.value?.querySelector("button")?.focus();
  }
};
onMounted(() => {
  document.addEventListener("mousedown", outside);
  document.addEventListener("keydown", escape);
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", outside);
  document.removeEventListener("keydown", escape);
});
</script>

<template>
  <div ref="root" class="fieldset relative gap-1 py-0">
    <label :for="id" class="fieldset-legend">{{ label }}</label>
    <button
      :id="id"
      type="button"
      class="input flex min-h-11 w-full items-center justify-between gap-2 text-left"
      aria-haspopup="true"
      :aria-expanded="open"
      :disabled="disabled"
      @click="open = !open"
    >
      <span class="truncate" :class="{ 'text-base-content/50': !summary }">{{ summary || placeholder }}</span>
      <AppIcon name="down" :size="16" class="shrink-0" />
    </button>
    <div
      v-if="open"
      class="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
    >
      <p v-if="options.length === 0" class="p-2 text-sm text-base-content/60">{{ emptyText }}</p>
      <label
        v-for="o in options"
        :key="o.value"
        class="flex min-h-11 cursor-pointer items-center gap-3 rounded-field px-2 hover:bg-base-200"
      >
        <input
          type="checkbox"
          class="checkbox checkbox-primary checkbox-sm"
          :checked="model.includes(o.value)"
          @change="toggle(o.value)"
        />
        <span class="min-w-0 flex-1 truncate">{{ o.label }}</span>
        <span v-if="o.hint" class="truncate text-xs text-base-content/60">{{ o.hint }}</span>
      </label>
    </div>
  </div>
</template>
