<template>
  <div class="p-4 h-dvh">
    <div class="h-[80%] min-h-[500px] min-w-[600px]">
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
            {{ getweeklyDates(date) }}
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
          >
            <!-- Top Redundant Cell before time starts for giving the calendar some space -->
            <div
              class="w-full border-b-[1px] border-gray-200"
              :style="{ height: `${redundantCellHeight}px` }"
            />

            <!-- Time Grid -->
            <div
              class="flex relative cell"
              v-for="time in twentyFourHourFormat"
              :data-time-attr="time"
            >
              <div
                class="w-full border-b-[1px] border-gray-200"
                :style="{ height: `${hourHeight}px` }"
              />
            </div>

            <!-- Calendar Events populations  -->
            <CalendarEvent
              v-for="(calendarEvent, idx) in parsedData[parseDate(date)]"
              :event="calendarEvent"
              class="mb-2 cursor-pointer absolute w-full"
              :draggable="false"
              :key="calendarEvent.name"
              :date="date"
              :style="setEventStyles(calendarEvent, idx)"
              :stylesProp="setEventStyles(calendarEvent, idx)"
              @mouseout="(e) => handleBlur(e)"
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
</template>
<script setup>
import { computed, ref, onMounted } from 'vue'
import CalendarEvent from './CalendarEvent.vue'

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

let twentyFourHourFormat = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
]

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

function calculateDiff(from, to) {
  let fromMinutes = calculateMinutes(from)
  let toMinutes = calculateMinutes(to)
  return toMinutes - fromMinutes
}

function calculateMinutes(time) {
  let [hours, minutes] = time.split(':')
  return parseInt(hours) * 60 + parseInt(minutes)
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

let daysList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getweeklyDates(date) {
  let d = new Date(date)
  let weekDate = d.toLocaleDateString().split('/')[0]
  let day = d.getDay()
  return daysList[day] + ' ' + weekDate
}

let parsedData = computed(() => {
  let groupByDate = Object.groupBy(props.events, (row) => row.date)
  let sortedArray = {}
  for (const [key, value] of Object.entries(groupByDate)) {
    let sortedEvents = value.sort((a, b) =>
      a.from_time < b.from_time ? -1 : 1
    )
    sortedArray[key] = sortedEvents
  }
  return sortedArray
})

function parseDate(date) {
  return new Date(date).toLocaleDateString().split('/').reverse().join('-')
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
