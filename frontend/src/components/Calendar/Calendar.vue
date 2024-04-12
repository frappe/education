<template>
  <div class="p-5 h-full">
    <div class="flex justify-between mb-2">
      <!-- left side  -->
      <!-- Year, Month -->
      <span class="text-xl font-medium">
        {{ getMonth() + ', ' + currentYear }}</span
      >
      <!-- right side -->
      <!-- actions buttons for calendar -->
      <!-- Increment and Decrement Button, View change button default is months or can be set via props! -->
      <div class="flex gap-x-1">
        <!-- <button class="border-2 border-green-500 p-2">Previous</button> -->
        <Button
          @click="decrementClickEvents[activeView]"
          variant="ghost"
          class="h-4 w-4"
          icon="chevron-left"
        />
        <Button
          @click="incrementClickEvents[activeView]"
          variant="ghost"
          class="h-4 w-4"
          icon="chevron-right"
        />
        <TabButtons :buttons="enabledModes" class="ml-2" v-model="activeView" />
      </div>
    </div>
    <CalendarMonthly
      v-if="activeView === 'Month'"
      :events="events"
      :currentYear="currentYear"
      :currentMonthDates="currentMonthDates"
      :currentMonth="currentMonth"
      :config="overrideConfig"
    />

    <CalendarWeekly
      v-else-if="activeView === 'Week'"
      :events="events"
      :weeklyDates="datesInWeeks[week]"
      :config="overrideConfig"
    />

    <CalendarDaily
      v-else
      :events="events"
      :currentMonthEvents="parsedData"
      :daysList="daysList"
      :current-date="currentMonthDates[date]"
      :config="overrideConfig"
    />
  </div>
</template>
<script setup>
import { computed, provide, ref } from 'vue'
import { Button, TabButtons } from 'frappe-ui'
import {
  groupBy,
  getCalendarDates,
  monthList,
  daysList,
  parseDate,
} from './calendarUtils'
import CalendarMonthly from '@/components/Calendar/CalendarMonthly.vue'
import CalendarWeekly from './CalendarWeekly.vue'
import CalendarDaily from './CalendarDaily.vue'

const props = defineProps({
  events: {
    type: Object,
    required: false,
  },
  config: {
    type: Object,
    default: {
      scrollToHour: 15,
      hourHeight: 72,
      redundantCellHeight: 22,
      disableModes: [],
      defaultMode: 'Week',
    },
  },
})

let defaultConfig = {
  scrollToHour: 15,
  hourHeight: 72,
  redundantCellHeight: 22,
  disableModes: [],
  defaultMode: 'Week',
}

let overrideConfig = { ...defaultConfig, ...props.config }

let events = computed({
  get() {
    return props.events
  },
  set(newVal) {
    emit('dragEvent', newVal)
  },
})

provide('updateEventState', updateEventState)

function updateEventState(...updatedState) {
  debugger
  const { calendarEventID, date, height } = updatedState[0]
  let event = events.value.findIndex((e) => e.name === calendarEventID)
  events.value[event].date = parseDate(date)
  events.value[event].to_time = '16:00:00'
}

// Calendar View Options
const actionOptions = [
  { label: 'Day', variant: 'solid' },
  { label: 'Week', variant: 'solid' },
  { label: 'Month', variant: 'solid' },
]

let enabledModes = actionOptions.filter(
  (mode) => !overrideConfig.disableModes.includes(mode.label)
)
let activeView = ref(overrideConfig.defaultMode)

let currentYear = ref(new Date().getFullYear())
let currentMonth = ref(new Date().getMonth())
let currentDate = ref(new Date())

let currentMonthDates = computed(() => {
  let dates = getCalendarDates(currentMonth.value, currentYear.value)
  return dates
})

let datesInWeeks = computed(() => {
  let dates = [...currentMonthDates.value]
  let datesInWeeks = []
  while (dates.length) {
    let week = dates.splice(0, 7)
    datesInWeeks.push(week)
  }
  return datesInWeeks
})

function findCurrentWeek(date) {
  return datesInWeeks.value.findIndex((week) =>
    week.find(
      (d) =>
        new Date(d).toLocaleDateString().split('T')[0] ===
        new Date(date).toLocaleDateString().split('T')[0]
    )
  )
}

let week = ref(findCurrentWeek(currentDate.value))

let date = ref(
  currentMonthDates.value.findIndex(
    (date) => new Date(date).toDateString() === currentDate.value.toDateString()
  )
)

let parsedData = computed(() => groupBy(props.events, (row) => row.date))

let incrementClickEvents = {
  Month: incrementMonth,
  Week: incrementWeek,
  Day: incrementDay,
}

let decrementClickEvents = {
  Month: decrementMonth,
  Week: decrementWeek,
  Day: decrementDay,
}

function incrementMonth() {
  currentMonth.value++
  date.value = findFirstDateOfMonth(currentMonth.value, currentYear.value)
  week.value = findCurrentWeek(currentMonthDates.value[date.value]) + 1
  if (currentMonth.value > 11) {
    currentMonth.value = 0
    currentYear.value++
  }
}

function decrementMonth() {
  currentMonth.value--
  date.value = findLastDateOfMonth(currentMonth.value, currentYear.value)
  week.value = findCurrentWeek(currentMonthDates.value[date.value])
  if (currentMonth.value < 0) {
    currentMonth.value = 11
    currentYear.value--
  }
}

function incrementWeek() {
  week.value += 1
  if (week.value < datesInWeeks.value.length) {
    date.value = findIndexOfDate(datesInWeeks.value[week.value][0])
  }
  if (week.value > datesInWeeks.value.length - 1) {
    incrementMonth()
  }
  let nextMonthDates = filterCurrentWeekDates()
  if (nextMonthDates.length > 0) {
    incrementMonth()
    week.value = findCurrentWeek(nextMonthDates[0])
  }
}

function decrementWeek() {
  week.value -= 1
  if (week.value < 0) {
    decrementMonth()
    return
  }

  if (week.value > 0) {
    date.value = findIndexOfDate(datesInWeeks.value[week.value][0])
  }

  let previousMonthDates = filterCurrentWeekDates()
  if (previousMonthDates.length > 0) {
    decrementMonth()
    week.value = findCurrentWeek(previousMonthDates[0])
  }
}

function filterCurrentWeekDates() {
  let currentWeekDates = datesInWeeks.value[week.value]
  let differentMonthDates = currentWeekDates.filter(
    (d) => d.getMonth() !== currentMonth.value
  )
  return differentMonthDates
}

function incrementDay() {
  date.value++
  if (
    date.value > currentMonthDates.value.length - 1 ||
    !isCurrentMonthDate(currentMonthDates.value[date.value])
  ) {
    incrementMonth()
  }
}

function decrementDay() {
  date.value--
  if (
    date.value < 0 ||
    !isCurrentMonthDate(currentMonthDates.value[date.value])
  ) {
    decrementMonth()
  }
}

function findLastDateOfMonth(month, year) {
  let inputDate = new Date(year, month + 1, 0)
  let lastDateIndex = currentMonthDates.value.findIndex(
    (date) => new Date(date).toDateString() === inputDate.toDateString()
  )
  return lastDateIndex
}

function findFirstDateOfMonth(month, year) {
  let inputDate = new Date(year, month, 1)
  let firstDateIndex = currentMonthDates.value.findIndex(
    (date) => new Date(date).toDateString() === inputDate.toDateString()
  )
  return firstDateIndex
}

function findIndexOfDate(date) {
  return currentMonthDates.value.findIndex(
    (d) => new Date(d).toDateString() === new Date(date).toDateString()
  )
}

function getMonth() {
  return monthList[currentMonth.value]
}

function isCurrentMonthDate(date) {
  date = new Date(date)
  return date.getMonth() === currentMonth.value
}
</script>

<style></style>
