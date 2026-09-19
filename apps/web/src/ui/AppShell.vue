<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "./AppIcon.vue";

// The frame of the app for a signed in person: a side menu on a wide screen, and a menu
// that slides in from a button on a small screen.
defineProps<{ navLabel: string; menuLabel: string }>();
const route = useRoute();
const toggle = ref<HTMLInputElement>();
// Going to another page closes the menu on a small screen.
watch(
  () => route.fullPath,
  () => toggle.value && (toggle.value.checked = false),
);
</script>

<template>
  <div class="drawer min-h-screen bg-base-200 text-base-content lg:drawer-open">
    <input id="app-menu" ref="toggle" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content flex min-w-0 flex-col">
      <header
        class="sticky top-0 z-20 flex items-center gap-2 border-b border-base-300 bg-base-100/90 px-3 py-2 backdrop-blur lg:hidden"
      >
        <label for="app-menu" class="btn btn-square btn-ghost" :aria-label="menuLabel"
          ><AppIcon name="menu"
        /></label>
        <slot name="brand" />
      </header>
      <div class="flex-1"><slot /></div>
    </div>
    <div class="drawer-side z-30">
      <label for="app-menu" class="drawer-overlay" :aria-label="menuLabel" />
      <aside class="flex min-h-full w-72 flex-col gap-2 border-r border-base-300 bg-base-100 p-4">
        <div class="px-2 pb-3 pt-2"><slot name="brand" /></div>
        <nav :aria-label="navLabel" class="flex-1">
          <ul class="menu w-full gap-1 p-0">
            <slot name="nav" />
          </ul>
        </nav>
        <slot name="footer" />
      </aside>
    </div>
  </div>
</template>
