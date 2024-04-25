<template>
  <div class="p-6 bg-white rounded shadow flex flex-col gap-5 w-80 !z-100">
    <div class="font-semibold text-xl">{{ calendarEvent.title }}</div>
    <div class="flex flex-col gap-4">
      <div class="flex gap-2 items-center">
        <FeatherIcon name="calendar" class="h-4 w-4" />
        <span class="text-sm font-normal">
          {{ parseDateEventPopupFormat(date) }}
        </span>
      </div>
      <div class="flex gap-2 items-center" v-if="calendarEvent.with">
        <FeatherIcon name="user" class="h-4 w-4" />
        <span class="text-sm font-normal"> {{ calendarEvent.with }} </span>
      </div>
      <div
        class="flex gap-2 items-center"
        v-if="calendarEvent.from_time && calendarEvent.to_time"
      >
        <FeatherIcon name="clock" class="h-4 w-4" />
        <span class="text-sm font-normal">
          {{ calendarEvent.from_time }} - {{ calendarEvent.to_time }}
        </span>
      </div>
      <div class="flex gap-2 items-center" v-if="calendarEvent.room">
        <FeatherIcon name="circle" class="h-4 w-4" />
        <span class="text-sm font-normal">
          Room No: &nbsp {{ calendarEvent.room }}
        </span>
      </div>
    </div>
  </div>
</template>
<script setup>
import { FeatherIcon } from 'frappe-ui'

import { parseDateEventPopupFormat } from './calendarUtils'

const props = defineProps({
  calendarEvent: { type: Object, required: true },
  date: { type: Date, required: true },
})
</script>
<style></style>
