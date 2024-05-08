<template>
  <div class="h-[90%] min-h-[500px] min-w-[600px]">
    <span class="font-bold">{{ parseDateWithComma(currentDate) }}</span>
    <div class="h-full overflow-hidden">
      <div
        class="border-l-[1px] border-t-[1px] border-b-[1px] h-full w-full flex overflow-scroll"
        ref="gridRef"
      >
        <!-- Left column -->
        <div class="grid grid-cols-1 h-full w-16">
          <span
            v-for="time in 24"
            class="text-center text-gray-600 font-normal text-sm flex items-end justify-center h-[72px]"
            :style="{ height: `${hourHeight}px` }"
          />
        </div>

        <!-- Calendar Grid / Right Column -->
        <div class="grid grid-cols-1 w-full pb-2 h-full">
          <div class="border-r-[1px] relative calendar-column">
            <!-- Top Redundant Cell before time starts for giving the calendar some space -->
            <div
              class="w-full border-b-[1px] border-gray-200"
              :style="{ height: `${redundantCellHeight}px` }"
            />
            <!-- Day Grid -->
            <div
              class="flex relative"
              v-for="time in twentyFourHoursFormat"
              :data-time-attr="time"
              @dblclick="openNewEventModal($event, time)"
            >
              <div
                class="w-full border-b-[1px] border-gray-200"
                :style="{ height: `${hourHeight}px` }"
              />
            </div>
            <CalendarEvent
              v-for="(calendarEvent, idx) in currentMonthEvents[
                parseDate(currentDate)
              ]"
              class="mb-2 cursor-pointer absolute"
              :event="calendarEvent"
              :key="calendarEvent.id"
              :date="currentDate"
              :style="setEventStyles(calendarEvent, idx)"
              @mouseout="(e) => handleBlur(e)"
            />
            <!-- Current time style  -->
            <div
              class="pl-2 absolute top-20 w-full z-50"
              v-if="
                new Date(currentDate).toDateString() ===
                new Date().toDateString()
              "
              :style="setCurrentTime"
            >
              <div class="h-0.5 bg-red-600 current-time relative" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <NewEventModal
    v-if="showEventModal"
    v-model="showEventModal"
    :event="newEvent"
  />
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import CalendarEvent from './CalendarEvent.vue'
import NewEventModal from './NewEventModal.vue'

import {
  parseDate,
  parseDateWithComma,
  calculateDiff,
  calculateMinutes,
  twentyFourHoursFormat,
  convertMinutesToHours,
} from './calendarUtils'

const props = defineProps({
  events: {
    type: Object,
    required: false,
  },
  currentMonthEvents: {
    type: Object,
    required: true,
  },
  daysList: {
    type: Array,
  },
  config: {
    type: Object,
  },
  currentDate: {
    type: Object,
    required: true,
  },
})

let redundantCellHeight = props.config.redundantCellHeight
let hourHeight = props.config.hourHeight
let minuteHeight = hourHeight / 60
let increaseZIndex = ref(false)

let setCurrentTime = computed(() => {
  let d = new Date()
  let hour = d.getHours()
  let minutes = d.getMinutes()
  let top = (hour * 60 + minutes) * minuteHeight + redundantCellHeight + 'px'
  return { top }
})

function setEventStyles(event, index) {
  let diff = calculateDiff(event.from_time, event.to_time)
  let height = diff * minuteHeight + 'px'
  let top =
    calculateMinutes(event.from_time) * minuteHeight +
    redundantCellHeight +
    'px'
  return { height, top, zIndex: index }
}

const showEventModal = ref(false)
const newEvent = reactive({
  date: '',
  participant: '',
  from_time: '',
  to_time: '',
  venue: '',
  title: '',
})
function openNewEventModal(event, from_time) {
  if (!props.config.isEditMode) return
  let date = props.currentDate
  let to_time = convertMinutesToHours(calculateMinutes(from_time) + 60).slice(
    0,
    -3
  )

  newEvent.date = parseDate(date)
  newEvent.from_time = from_time
  newEvent.to_time = to_time
  showEventModal.value = true
}

function handleClick(e) {
  // change the event z-index to 100
  increaseZIndex.value = true
  e.target.parentElement.style.zIndex = 100
}

function handleBlur(e, calendarEvent) {
  // change the event z-index to 0
  increaseZIndex.value = false
  e.target.parentElement.style.zIndex = 0
}
</script>
