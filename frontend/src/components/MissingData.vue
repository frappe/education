<template lang="">
  <div class="flex flex-col items-center justify-center gap-2 h-[250px]">
    <FeatherIcon name="inbox" class="h-8 w-8 text-gray-400" />
    <p class="text-sm text-gray-500">{{ message }}</p>
  </div>
</template>
<script setup>
import { FeatherIcon } from 'frappe-ui'
const props = defineProps({
  message: {
    type: String,
    default: 'No data found',
  },
})
</script>
