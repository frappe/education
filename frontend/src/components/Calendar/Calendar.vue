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
      :config="overrideConfig"
    />
  </div>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue'
import { Button, TabButtons } from 'frappe-ui'
import { groupBy, getCalendarDates } from '@/utils'
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
      defaultMode: 'Month',
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

let monthList = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

let shortMonthList = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

let daysList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

let currentWeek = computed(() =>
  datesInWeeks.value.findIndex((week) =>
    week.find(
      (date) =>
        new Date(date).toLocaleDateString().split('T')[0] ===
        new Date().toLocaleDateString().split('T')[0]
    )
  )
)
let week = ref(currentWeek.value)

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
  week.value = 0
  if (currentMonth.value > 11) {
    currentMonth.value = 0
    currentYear.value++
  }
}

function decrementMonth() {
  currentMonth.value--
  if (currentMonth.value < 0) {
    currentMonth.value = 11
    currentYear.value--
  }
}

function incrementWeek() {
  week.value += 1
  if (week.value > datesInWeeks.value.length - 1) {
    week.value = 0
    incrementMonth()
  }
}

function decrementWeek() {
  week.value -= 1
  if (week.value < 0) {
    week.value = datesInWeeks.value.length - 1
    decrementMonth()
  }
}

function incrementDay() {
  console.log('incrementDay')
}

function decrementDay() {
  console.log('decrementDay')
}

function parseDate(date) {
  let dd = date.getDate()
  let mm = date.getMonth() + 1
  let yyyy = date.getFullYear()

  if (dd < 10) dd = '0' + dd
  if (mm < 10) mm = '0' + mm

  return `${yyyy}-${mm}-${dd}`
}

function getMonth() {
  return monthList[currentMonth.value]
}
</script>

<style></style>
