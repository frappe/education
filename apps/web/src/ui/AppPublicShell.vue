<script setup lang="ts">
// The frame for people who are not signed in: a slim top bar and a footer.
</script>

<template>
  <div class="flex min-h-screen flex-col bg-base-200 text-base-content">
    <header class="border-b border-base-300 bg-base-100">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:px-8">
        <slot name="brand" />
        <div class="flex items-center gap-2"><slot name="actions" /></div>
      </div>
    </header>
    <div class="flex-1"><slot /></div>
    <footer class="px-4 py-6 text-center text-sm text-base-content/60"><slot name="footer" /></footer>
  </div>
</template>
