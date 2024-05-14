<template>
  <CalendarEvent
    :event="event"
    :date="date"
    :key="event.id"
    class="cursor-pointer w-[90%] mb-1"
  />
  <span
    v-if="totalEventsCount > 1"
    class="text-gray-600 text-sm font-bold w-fit self-center hover:bg-gray-200 hover:cursor-pointer rounded-sm p-[1px]"
    @click="emit('showMoreEvents')"
  >
    +{{ totalEventsCount - 1 }} more
  </span>
</template>
<script setup>
import CalendarEvent from './CalendarEvent.vue'

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  totalEventsCount: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['showMoreEvents'])
</script>
<style></style>
