<script setup lang="ts">
import AppIcon, { type IconName } from "./AppIcon.vue";
defineProps<{ to: string; icon: IconName; exact?: boolean }>();
</script>

<template>
  <li>
    <RouterLink
      :to="to"
      class="min-h-11 gap-3 rounded-field font-medium"
      :active-class="exact ? '' : 'bg-primary/10! text-primary!'"
      :exact-active-class="exact ? 'bg-primary/10! text-primary!' : ''"
    >
      <AppIcon :name="icon" :size="20" /><slot />
    </RouterLink>
  </li>
</template>
