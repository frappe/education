<template>
  <div
    v-bind="$attrs"
    class="p-2 rounded-lg h-min-[18px] w-[90%]"
    ref="eventRef"
    :class="colorMap[calendarEvent?.color]?.background_color || 'bg-green-100'"
    :style="setEventStyles"
    @click="updatePosition"
    @mousedown="(e) => handleRepositionMouseDown(e)"
  >
    <div
      class="flex gap-3 relative px-2 items-start h-full overflow-hidden select-none"
      :class="
        calendarEvent.from_time && [
          'border-l-2',
          colorMap[calendarEvent?.color]?.border_color || 'border-green-600',
        ]
      "
    >
      <FeatherIcon name="circle" class="h-4 text-black" />

      <div class="flex flex-col whitespace-nowrap w-fit overflow-hidden">
        <p class="font-medium text-sm text-gray-800 text-ellipsis">
          {{ calendarEvent.title }}
        </p>
        <p
          class="font-normal text-xs text-gray-800 text-ellipsis"
          v-if="calendarEvent.from_time"
        >
          {{ calendarEvent.from_time }} - {{ calendarEvent.to_time }}
        </p>
      </div>
    </div>
    <div
      v-if="activeView !== 'Month'"
      class="absolute h-[8px] w-[100%] cursor-row-resize"
      ref="resize"
      @mousedown="handleResizeMouseDown"
    ></div>
  </div>

  <div
    ref="popoverRef"
    class="flex flex-col gap-5 pt-5 px-6 pb-6 w-80 bg-white rounded shadow fixed z-20"
    v-show="opened"
  >
    <!-- heading  -->
    <div class="font-semibold text-xl">{{ calendarEvent.title }}</div>

    <!-- event info container -->
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

  <!-- <div v-else class="w-full p-2 rounded-md " :class="event.background_color  || 'bg-green-100'" @click="togglePopover">
		<div class="flex gap-3 relative px-2 items-start select-none"
		>
			<FeatherIcon name="circle" class="h-4 text-black" />

			<div class="flex flex-col whitespace-nowrap w-fit overflow-hidden">
				<p class="font-medium text-sm text-gray-800 text-ellipsis">
					{{ event.title }}
				</p>
				<p class="font-normal text-xs text-gray-800 text-ellipsis" v-if="event.from_time">
					{{ event.from_time }} - {{ event.to_time }}
				</p>
			</div>
		</div>
	</div> -->
</template>

<script setup>
import { FeatherIcon, Popover } from 'frappe-ui'
import NestedPopover from '@/components/NestedPopover.vue'
import { createPopper } from '@popperjs/core'

import { ref, nextTick, inject, computed } from 'vue'

import {
  calculateMinutes,
  convertMinutesToHours,
  calculateDiff,
  parseDate,
  parseDateEventPopupFormat,
} from './calendarUtils'

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
})
const activeView = inject('activeView')

const calendarEvent = ref(props.event)

const setEventStyles = computed(() => {
  const minuteHeight = 1.2
  const redundantCellHeight = 22

  let diff = calculateDiff(
    calendarEvent.value.from_time,
    calendarEvent.value.to_time
  )
  let height = diff * minuteHeight + 'px'
  if (activeView.value === 'Month') {
    height = 'auto'
  }
  let top =
    calculateMinutes(calendarEvent.value.from_time) * minuteHeight +
    redundantCellHeight +
    'px'

  return {
    height,
    top,
    zIndex: calendarEvent.value.idx,
    left: '0',
  }
})

const eventRef = ref(null)
const popoverRef = ref(null)
const popper = ref(null)
const opened = ref(false)
const resize = ref(null)
const eventStepper = ref(0)
const isResizing = ref(false)
const isRepositioning = ref(false)
const isEventUpdated = ref(false)
let colorMap = {
  blue: {
    background_color: 'bg-blue-100',
    border_color: 'border-blue-600',
  },
  green: {
    background_color: 'bg-green-100',
    border_color: 'border-green-600',
  },
  red: {
    background_color: 'bg-red-200',
    border_color: 'border-red-600',
  },
  orange: {
    background_color: 'bg-orange-100',
    border_color: 'border-orange-600',
  },
  yellow: {
    background_color: 'bg-yellow-100',
    border_color: 'border-yellow-600',
  },
  teal: {
    background_color: 'bg-teal-100',
    border_color: 'border-teal-600',
  },
  violet: {
    background_color: 'bg-violet-100',
    border_color: 'border-violet-600',
  },
  cyan: {
    background_color: 'bg-cyan-100',
    border_color: 'border-cyan-600',
  },
  purple: {
    background_color: 'bg-purple-100',
    border_color: 'border-purple-600',
  },
  pink: {
    background_color: 'bg-pink-100',
    border_color: 'border-pink-600',
  },
  amber: {
    background_color: 'bg-amber-100',
    border_color: 'border-amber-600',
  },
}

let updateEventState = inject('updateEventState')

function newEventEndTime(newHeight) {
  // TODO:Instead of 1.2 bring defaultCellHeight from Provide
  let newEndTime =
    parseFloat(newHeight) / 1.2 +
    calculateMinutes(calendarEvent.value.from_time)
  newEndTime = Math.floor(newEndTime)
  return convertMinutesToHours(newEndTime)
}

function newEventDuration(changeInTime) {
  let newFromTime =
    calculateMinutes(calendarEvent.value.from_time) + changeInTime / 1.2
  let newToTime =
    calculateMinutes(calendarEvent.value.to_time) + changeInTime / 1.2
  if (newFromTime < 0) {
    newFromTime = 0
    newToTime = calculateDiff(
      calendarEvent.value.from_time,
      calendarEvent.value.to_time
    )
  }

  if (newToTime > 1440) {
    newToTime = 1440
    newFromTime =
      newToTime -
      calculateDiff(calendarEvent.value.from_time, calendarEvent.value.to_time)
  }

  return [convertMinutesToHours(newFromTime), convertMinutesToHours(newToTime)]
}

function handleResizeMouseDown(e) {
  isResizing.value = true
  isRepositioning.value = false
  if (isRepositioning.value) return
  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize, { once: true })

  function resize(e) {
    let height_15_min = 18
    //take difference between where mouse is and where event's top is
    eventRef.value.style.height =
      Math.round(
        (e.clientY - eventRef.value.getBoundingClientRect().top) / height_15_min
      ) *
        height_15_min +
      'px'

    eventRef.value.style.width = '100%'
    calendarEvent.value.to_time = newEventEndTime(eventRef.value.style.height)
  }

  function stopResize() {
    eventRef.value.style.width = '90%'
    isResizing.value = false

    updateEventState(calendarEvent.value)

    window.removeEventListener('mousemove', resize)
  }
}

function handleRepositionMouseDown(e) {
  if (activeView.value === 'Month') return
  let prevY = e.clientY
  isRepositioning.value = true

  if (isResizing.value) return

  window.addEventListener('mousemove', mousemove)
  window.addEventListener('mouseup', mouseup)

  function mousemove(e) {
    if (!eventRef.value) return
    let oldCalendarEvent = { ...calendarEvent.value }
    eventRef.value.style.cursor = 'move'
    eventRef.value.style.width = '100%'

    // handle movement between days
    handleHorizontalMovement(e.clientX)
    // handle movement within the same day
    handleVerticalMovement(e.clientY, prevY)
    prevY = e.clientY

    if (
      oldCalendarEvent.from_time !== calendarEvent.value.from_time ||
      oldCalendarEvent.to_time !== calendarEvent.value.to_time ||
      oldCalendarEvent.date !== calendarEvent.value.date
    ) {
      isEventUpdated.value = true
    }
  }

  function mouseup() {
    isRepositioning.value = false

    if (!eventRef.value) return

    eventRef.value.style.cursor = 'pointer'
    eventRef.value.style.width = '90%'

    window.removeEventListener('mousemove', mousemove)
    window.removeEventListener('mouseup', mouseup)

    if (isEventUpdated.value) {
      updateEventState(calendarEvent.value)
      isEventUpdated.value = false
    }
  }
}

function getDate(date, nextDate = 0) {
  let newDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + nextDate
  )
  return newDate
}

function handleHorizontalMovement(clientX) {
  const rect = eventRef.value.getBoundingClientRect()
  let currentDate = new Date(
    eventRef.value.parentNode.getAttribute('data-date-attr')
  )
  let oldDate = calendarEvent.value.date
  let newDate = oldDate
  if (clientX < rect.left) {
    newDate = parseDate(getDate(currentDate, -1))
    calendarEvent.value.date = newDate
  } else if (clientX > rect.right) {
    newDate = parseDate(getDate(currentDate, 1))
    calendarEvent.value.date = newDate
  }

  if (oldDate !== newDate) {
    updateEventState(calendarEvent.value)
  }
}

function handleVerticalMovement(clientY, prevY) {
  let diffY = clientY - prevY
  diffY = Math.round(diffY / 18) * 18

  let [oldFromTime, oldToTime] = [
    calendarEvent.value.from_time,
    calendarEvent.value.to_time,
  ]

  oldFromTime = removeSeconds(oldFromTime)
  oldToTime = removeSeconds(oldToTime)

  const [newFromTime, newToTime] = newEventDuration(diffY)

  if (oldFromTime === newFromTime && oldToTime === newToTime) return
  calendarEvent.value.from_time = newFromTime
  calendarEvent.value.to_time = newToTime
}

function removeSeconds(time) {
  return time.split(':').slice(0, 2).join(':') + ':00'
}

function setupPopper() {
  if (!popper.value) {
    popper.value = createPopper(eventRef.value.el, popoverRef.value.el, {
      placement: 'right-start',
    })
  } else {
    popper.value.update()
  }
}

function updatePosition() {
  opened.value = !opened.value
  nextTick(() => setupPopper())
}
</script>
