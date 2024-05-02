<template>
  <div class="h-[92%] min-h-[600px] min-w-[600px]">
    <!-- Day List -->
    <div class="grid grid-cols-7 w-full pb-2">
      <span
        v-for="day in daysList"
        class="text-center text-gray-600 font-normal text-sm"
        >{{ day }}</span
      >
    </div>

    <!-- Date Grid -->
    <div
      class="grid grid-cols-7 border-t-[1px] border-l-[1px] h-full w-full grid-rows-6"
    >
      <div
        v-for="date in currentMonthDates"
        class="border-r-[1px] border-b-[1px] border-gray-200"
        @dragover.prevent
        @drageneter.prevent
        @drop="onDrop($event, date)"
      >
        <div
          class="flex justify-center h-full font-normal mx-2"
          :class="currentMonthDate(date) ? 'text-gray-700' : 'text-gray-200'"
        >
          <div
            v-if="currentMonthDate(date)"
            class="flex flex-col items-center w-full overflow-y-auto"
          >
            <span
              class="py-1 sticky top-0 bg-white w-full text-center z-10"
              :class="
                date.toDateString() === new Date().toDateString() && 'font-bold'
              "
            >
              {{ date.getDate() }}
            </span>

            <div class="w-full">
              <CalendarEvent
                v-for="calendarEvent in parsedData[parseDate(date)]"
                :event="calendarEvent"
                :date="date"
                class="mb-2 cursor-pointer w-full"
                :key="calendarEvent.id"
                :draggable="config.isEditMode"
                @dragstart="dragStart($event, calendarEvent.id)"
                @dragend="$event.target.style.opacity = '1'"
                @dragover="dragOver($event)"
              />
            </div>
          </div>
          <span v-else>{{
            parseDateEventPopupFormat(date, (showDay = false))
          }}</span>
        </div>
      </div>
    </div>
    <!-- <div class=" w-20 h-20 bg-orange-400 absolute top-[212px] left">
			
		</div> -->
  </div>
</template>

<script setup>
import {
  groupBy,
  parseDateEventPopupFormat,
  daysList,
  calculateMinutes,
  parseDate,
} from './calendarUtils'
import { computed, inject } from 'vue'
import CalendarEvent from './CalendarEvent.vue'

const props = defineProps({
  events: {
    type: Object,
    required: true,
  },
  currentMonthDates: {
    type: Array,
    required: true,
  },
  currentMonth: {
    type: Number,
    required: true,
  },
  currentYear: {
    type: Number,
    required: true,
  },
  config: {
    type: Object,
  },
})

const config = inject('config')

let parsedData = computed(() => {
  let groupByDate = groupBy(props.events, (row) => row.date)
  let sortedArray = {}
  for (const [date, events] of Object.entries(groupByDate)) {
    let sortedEvents = sortEvents(events)
    sortedArray[date] = sortedEvents
  }
  return sortedArray
})

function sortEvents(events) {
  let sortedEvents = events.sort((a, b) =>
    a.from_time !== b.from_time
      ? calculateMinutes(a.from_time) > calculateMinutes(b.from_time)
        ? 1
        : -1
      : calculateMinutes(a.to_time) > calculateMinutes(b.to_time)
      ? 1
      : -1
  )
  return sortedEvents
}

function currentMonthDate(date) {
  return date.getMonth() === props.currentMonth
}

let updateEventState = inject('updateEventState')

const dragStart = (event, calendarEventID) => {
  event.target.style.opacity = '0.5'
  event.target.style.cursor = 'move'
  event.dataTransfer.dropEffect = 'move'
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('calendarEventID', calendarEventID)
}

const dragOver = (event) => {
  event.preventDefault()
}

const onDrop = (event, date) => {
  let calendarEventID = event.dataTransfer.getData('calendarEventID')
  event.target.style.cursor = 'default'
  // if same date then return
  let e = props.events.find((e) => e.id === calendarEventID)
  if (parseDate(date) === e.date) return
  let calendarEvent = props.events.find((e) => e.id === calendarEventID)
  calendarEvent.date = parseDate(date)
  updateEventState(calendarEvent)
}
</script>

<style></style>
