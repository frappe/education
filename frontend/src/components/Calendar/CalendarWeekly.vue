<template>
  <div class="p-4 h-[90%]">
    <div class="h-full min-h-[500px] min-w-[600px]">
      <!-- Day List -->
      <div class="flex">
        <div class="w-16"></div>
        <div class="grid grid-cols-7 w-full pb-2">
          <span
            v-for="date in weeklyDates"
            class="text-center text-gray-600 text-sm"
            :class="
              new Date(date).toDateString() === new Date().toDateString()
                ? 'font-bold'
                : 'font-normal'
            "
          >
            {{ parseDateWithComma(date) }}
          </span>
        </div>
      </div>

      <div class="border-[1px] h-8">
        <p class="w-16 text-center">All Day</p>
      </div>

      <div
        class="border-l-[1px] border-b-[1px] h-full w-full overflow-scroll flex"
        ref="gridRef"
      >
        <!-- Time List form 0 - 24 -->
        <div class="grid grid-cols-1 h-full w-16">
          <span
            v-for="time in 24"
            class="text-center text-gray-600 font-normal text-sm flex items-end justify-center h-[72px]"
            :style="{ height: `${hourHeight}px` }"
          />
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-7 w-full pb-2">
          <div
            v-for="(date, index) in weeklyDates"
            class="border-r-[1px] relative calendar-column"
            :data-date-attr="date"
          >
            <!-- Top Redundant Cell before time starts for giving the calendar some space -->
            <div
              class="w-full border-b-[1px] border-gray-200"
              :style="{ height: `${redundantCellHeight}px` }"
            />

            <!-- Time Grid -->
            <div
              class="flex relative cell cursor-pointer"
              v-for="time in twentyFourHoursFormat"
              :data-time-attr="time"
              @dblclick="openNewEventModal($event, time)"
            >
              <div
                class="w-full border-b-[1px] border-gray-200"
                :style="{ height: `${hourHeight}px` }"
              />
            </div>

            <!-- Calendar Events populations  -->
            <CalendarEvent
              v-for="(calendarEvent, idx) in parsedData[parseDate(date)]"
              class="mb-2 cursor-pointer absolute w-[90%]"
              :event="calendarEvent"
              :key="calendarEvent.id"
              :date="date"
            />

            <!-- Current time style  -->
            <div
              class="pl-2 absolute top-20 w-full z-50"
              v-if="new Date(date).toDateString() === new Date().toDateString()"
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
import { computed, ref, onMounted, reactive } from 'vue'
import CalendarEvent from './CalendarEvent.vue'
import NewEventModal from './NewEventModal.vue'
import {
  calculateMinutes,
  convertMinutesToHours,
  parseDateWithComma,
  twentyFourHoursFormat,
} from './calendarUtils'

let props = defineProps({
  events: {
    type: Object,
    required: true,
  },
  config: {
    type: Object,
  },
  weeklyDates: {
    type: Array,
    required: false,
  },
})
const gridRef = ref(null)

onMounted(() => {
  let scrollTop = props.config.scrollToHour * 60 * minuteHeight
  gridRef.value.scrollBy(0, scrollTop)
})

let increaseZIndex = ref(false)

let hourHeight = props.config.hourHeight
let minuteHeight = hourHeight / 60
let redundantCellHeight = props.config.redundantCellHeight

let setCurrentTime = computed(() => {
  let d = new Date()
  let hour = d.getHours()
  let minutes = d.getMinutes()
  let top = (hour * 60 + minutes) * minuteHeight + redundantCellHeight + 'px'
  return { top }
})

const parsedData = computed(() => {
  let groupByDate = Object.groupBy(props.events, (row) => row.date)
  let sortedArray = {}
  for (const [key, value] of Object.entries(groupByDate)) {
    let sortedEvents = value.sort((a, b) =>
      a.from_time < b.from_time ? -1 : 1
    )
    findOverlappingEventsCount(sortedEvents)
    sortedArray[key] = sortedEvents
  }
  return sortedArray
})

function findOverlappingEventsCount(events) {
  const overlapCounts = {}
  const startTimeMap = new Map()

  // Iterate through the events
  for (let i = 0; i < events.length; i++) {
    const currentEvent = events[i]
    const startTime = currentEvent.from_time

    // Check if the start time already exists in the hashmap
    if (startTimeMap.has(startTime)) {
      // If it exists, increment the count
      startTimeMap.set(startTime, startTimeMap.get(startTime) + 1)
    } else {
      // If it doesn't exist, initialize the count to 1
      startTimeMap.set(startTime, 1)
    }
  }

  events.forEach((event, idx) => {
    event.overlapCount = startTimeMap.get(event.from_time) || 0
    event.idx = idx
  })
}

function parseDate(date) {
  let dd = date.getDate()
  let mm = date.getMonth() + 1
  let yyyy = date.getFullYear()

  if (dd < 10) dd = '0' + dd
  if (mm < 10) mm = '0' + mm

  return `${yyyy}-${mm}-${dd}`
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
  let date = event.target.parentNode.parentNode.getAttribute('data-date-attr')
  let to_time = convertMinutesToHours(calculateMinutes(from_time) + 60).slice(
    0,
    -3
  )

  newEvent.date = parseDate(new Date(date))
  newEvent.from_time = from_time
  newEvent.to_time = to_time
  showEventModal.value = true
}
</script>

<style>
.calendar-column:first-child > div {
  border-left: 1px solid #e5e5e5;
}
.calendar-column:first-child > div::before {
  content: attr(data-time-attr);
  position: absolute;
  left: -45px;
  top: -9px;
  font-size: 12px;
  font-weight: 400;
}

.current-time::before {
  content: '';
  display: block;
  width: 12px;
  height: 12px;
  background-color: red;
  border-radius: 50%;
  position: absolute;
  left: -8px;
  top: -5px;
}
</style>
