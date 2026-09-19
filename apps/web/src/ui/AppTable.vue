<script setup lang="ts">
// A table that scrolls sideways on a small screen. Put <thead> and <tbody> inside.
</script>

<template>
  <div class="overflow-x-auto">
    <table class="table">
      <slot />
    </table>
  </div>
</template>
