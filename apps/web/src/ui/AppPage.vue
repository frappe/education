<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { cameFromApp, goBack } from "@/features/navigation/back";
import { messages } from "@/messages";
import AppIcon from "./AppIcon.vue";

// Page frame: a heading with an optional short text, a way back, and actions on the right.
// "Back" goes to the screen the person came from. `backTo` is where it goes when there is no such screen.
const props = defineProps<{
  title: string;
  subtitle?: string;
  narrow?: boolean;
  backTo?: string;
  backLabel?: string;
}>();
const router = useRouter();
const fromApp = cameFromApp();
const label = computed(() => (fromApp ? messages.common.back : props.backLabel));
const href = computed(() => (props.backTo ? router.resolve(props.backTo).href : undefined));
function back(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // open in a new tab as usual
  event.preventDefault();
  goBack(router, props.backTo ?? "/");
}
</script>

<template>
  <main class="mx-auto w-full px-4 py-6 md:px-8 md:py-8" :class="narrow ? 'max-w-md' : 'max-w-6xl'">
    <a
      v-if="backTo"
      :href="href"
      class="mb-3 inline-flex min-h-8 items-center gap-1 text-sm text-base-content/60 hover:text-base-content"
      @click="back"
    >
      <AppIcon name="back" :size="16" />{{ label }}
    </a>
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-base-content/60">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </header>
    <div class="flex flex-col gap-6"><slot /></div>
  </main>
</template>
