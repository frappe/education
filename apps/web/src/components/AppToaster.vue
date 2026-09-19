<script setup lang="ts">
import { useToast } from "@/features/toast/useToast";
import AppToast from "@/ui/AppToast.vue";

const toast = useToast();
</script>

<template>
  <AppToast :items="toast.items" />
</template>
