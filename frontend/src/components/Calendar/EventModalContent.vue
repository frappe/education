<template>
  <div class="p-4 bg-white rounded shadow w-80">
    <div class="flex gap-2 flex-row-reverse">
      <span class="cursor-pointer" @click="$emit('close')">
        <FeatherIcon name="x" class="h-4 w-4" />
      </span>
      <span v-if="isEditMode" class="cursor-pointer" @click="$emit('edit')">
        <FeatherIcon name="edit-2" class="h-4 w-4" />
      </span>
      <span v-if="isEditMode" class="cursor-pointer" @click="$emit('delete')">
        <FeatherIcon name="trash-2" class="h-4 w-4" />
      </span>
    </div>
    <div class="flex flex-col gap-5">
      <div class="font-semibold text-xl flex justify-between">
        <span>{{ calendarEvent.title }}</span>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex gap-2 items-center">
          <FeatherIcon name="calendar" class="h-4 w-4" />
          <span class="text-sm font-normal">
            {{ parseDateEventPopupFormat(date) }}
          </span>
        </div>
        <div class="flex gap-2 items-center" v-if="calendarEvent.participant">
          <FeatherIcon name="user" class="h-4 w-4" />
          <span class="text-sm font-normal">
            {{ calendarEvent.participant }}
          </span>
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
        <div class="flex gap-2 items-center" v-if="calendarEvent.venue">
          <FeatherIcon name="map-pin" class="h-4 w-4" />
          <span class="text-sm font-normal">
            {{ calendarEvent.venue }}
          </span>
        </div>
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
  isEditMode: { type: Boolean },
})

const emits = defineEmits(['close', 'edit', 'delete'])
</script>
<style></style>
