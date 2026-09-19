<script setup lang="ts">
import AppIcon, { type IconName } from "./AppIcon.vue";
/** `badge` is a number shown at the end (for example how many things are not read). Nothing is shown for 0. */
defineProps<{ to: string; icon: IconName; exact?: boolean; badge?: number; badgeLabel?: string }>();
</script>

<template>
  <li>
    <RouterLink
      :to="to"
      class="min-h-11 content-center gap-3 rounded-field font-medium"
      :active-class="exact ? '' : 'bg-primary/10! text-primary!'"
      :exact-active-class="exact ? 'bg-primary/10! text-primary!' : ''"
    >
      <AppIcon :name="icon" :size="20" /><slot />
      <span v-if="badge" class="badge badge-primary badge-sm ml-auto" :aria-label="badgeLabel">{{
        badge > 99 ? "99+" : badge
      }}</span>
    </RouterLink>
  </li>
</template>
