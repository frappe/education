<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ name: string; size?: "sm" | "md" | "lg" }>();

// Full class names, so the build keeps them. The color is chosen from the name, so a person keeps theirs.
const colors = [
  "bg-primary/10 text-primary",
  "bg-secondary/15 text-secondary",
  "bg-accent/25 text-accent-content",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-error/10 text-error",
];
const initials = computed(() => {
  const words = props.name.trim().split(/\s+/).filter(Boolean);
  const pick = words.length > 1 ? [words[0]!, words[words.length - 1]!] : words.slice(0, 1);
  return pick.map((w) => Array.from(w)[0]!.toUpperCase()).join("");
});
const color = computed(() => {
  let sum = 0;
  for (const ch of props.name) sum = (sum + ch.codePointAt(0)!) % 997;
  return colors[sum % colors.length];
});
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center rounded-full font-semibold"
    :class="[
      color,
      {
        'size-8 text-xs': size === 'sm',
        'size-10 text-sm': !size || size === 'md',
        'size-14 text-lg': size === 'lg',
      },
    ]"
    aria-hidden="true"
    >{{ initials }}</span
  >
</template>
