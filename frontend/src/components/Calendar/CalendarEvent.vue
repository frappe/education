<template>
  <div
    v-bind="$attrs"
    class="p-2 rounded-lg h-min-[18px] w-[90%]"
    ref="eventRef"
    :class="colorMap[calendarEvent?.color]?.background_color || 'bg-green-100'"
    :style="activeView !== 'Month' && setEventStyles"
    @mouseout="(e) => handleBlur(e)"
    @dblclick="toggle()"
    v-on="{ mousedown: config.isEditMode && handleRepositionMouseDown }"
  >
    <div
      class="flex gap-2 relative px-2 items-start h-full overflow-hidden select-none"
      :class="
        calendarEvent.from_time && [
          'border-l-2',
          colorMap[calendarEvent?.color]?.border_color || 'border-green-600',
        ]
      "
    >
      <component
        v-if="eventIcons[calendarEvent.type]"
        :is="eventIcons[calendarEvent.type]"
        class="h-4 w-4 text-black"
      />
      <FeatherIcon v-else name="circle" class="h-4 text-black" />

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
      v-if="config.isEditMode && activeView !== 'Month'"
      class="absolute h-[8px] w-[100%] cursor-row-resize"
      ref="resize"
      @mousedown="handleResizeMouseDown"
    ></div>
  </div>

  <div ref="floating" :style="{ ...floatingStyles, zIndex: 100 }" v-if="opened">
    <EventModalContent
      :calendarEvent="calendarEvent"
      :date="date"
      :isEditMode="config.isEditMode"
      @close="close"
      @edit="handleEventEdit"
      @delete="handleEventDelete"
    />
  </div>
</template>

<script setup>
import { FeatherIcon } from 'frappe-ui'
import NestedPopover from '@/components/NestedPopover.vue'
import UsePopover from '@/components/UsePopover.vue'
import EventModalContent from './EventModalContent.vue'
import NewEventModal from './NewEventModal.vue'
import { useFloating, shift, flip, offset, autoUpdate } from '@floating-ui/vue'
import FloatingPopover from './FloatingPopover.vue'

import { ref, inject, computed, onMounted, onBeforeUnmount } from 'vue'

import {
  calculateMinutes,
  convertMinutesToHours,
  calculateDiff,
  parseDate,
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
const handleClickOutside = (e) => {
  const insidePopover = floating.value && floating.value.contains(e.target)
  if (insidePopover) return
  const insideTarget = eventRef.value && eventRef.value.contains(e.target)
  if (insideTarget) return
  close()
}

const calendarEvent = ref(props.event)
// console.log(calendarEvent.value.overlapingCount)
// calendarEvent.value.type = Math.random() > 0.5 && 'phone'
const activeView = inject('activeView')
const config = inject('config')
const eventIcons = config.eventIcons
const minuteHeight = config.hourHeight / 60

const setEventStyles = computed(() => {
  const redundantCellHeight = config.redundantCellHeight
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

  let left = '0'
  let overlapCount = calendarEvent.value.overlapCount
  let width = '90%'
  if (isResizing.value || isRepositioning.value) width = '100%'
  // TODO: Clashing Events
  if (overlapCount > 1) {
    left = `${(100 / overlapCount) * props.event.idx}%`
    width = isResizing.value || `${100 / overlapCount}%`
  } else {
    left = '0'
  }
  // let date = props.date.getMonth() + 1
  // if (date === 4) {
  //   console.log(props.event)
  // }

  return {
    height,
    top,
    zIndex: props.event.idx + 1,
    left,
    width,
  }
})

const eventRef = ref(null)
// Popover Element Config
const floating = ref(null)
const { floatingStyles } = useFloating(eventRef, floating, {
  placement: activeView.value === 'Day' ? 'top' : 'right',
  middleware: [offset(10), flip(), shift()],
  whileElementsMounted: autoUpdate,
})

const opened = ref(false)
const resize = ref(null)
const isResizing = ref(false)
const isRepositioning = ref(false)
const isEventUpdated = ref(false)
const updatedDate = ref(props.event.date)

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

function newEventEndTime(newHeight) {
  let newEndTime =
    parseFloat(newHeight) / minuteHeight +
    calculateMinutes(calendarEvent.value.from_time)
  newEndTime = Math.floor(newEndTime)
  // console.log(newEndTime, typeof newEndTime)
  if (newEndTime > 1440) {
    newEndTime = 1440
  }
  return convertMinutesToHours(newEndTime)
}

function newEventDuration(changeInTime) {
  let newFromTime =
    calculateMinutes(calendarEvent.value.from_time) +
    changeInTime / minuteHeight
  let newToTime =
    calculateMinutes(calendarEvent.value.to_time) + changeInTime / minuteHeight
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

const updateEventState = inject('updateEventState')

function handleResizeMouseDown(e) {
  isResizing.value = true
  isRepositioning.value = false
  if (isRepositioning.value) return
  let oldTime = calendarEvent.value.to_time
  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize, { once: true })

  function resize(e) {
    let height_15_min = minuteHeight * 15
    // difference between where mouse is and where event's top is, to find the new height
    let diffX = e.clientY - eventRef.value.getBoundingClientRect().top
    eventRef.value.style.height =
      Math.round(diffX / height_15_min) * height_15_min + 'px'

    eventRef.value.style.width = '100%'
    calendarEvent.value.to_time = newEventEndTime(eventRef.value.style.height)
  }

  function stopResize() {
    eventRef.value.style.width = '90%'
    isResizing.value = false
    if (oldTime !== calendarEvent.value.to_time) {
      updateEventState(calendarEvent.value)
    }

    window.removeEventListener('mousemove', resize)
  }
}

function handleRepositionMouseDown(e) {
  if (activeView.value === 'Month') return
  let prevY = e.clientY
  const rect = eventRef.value.getBoundingClientRect()
  const oldEvent = { ...calendarEvent.value }
  isRepositioning.value = true
  if (isResizing.value) return

  window.addEventListener('mousemove', mousemove)
  window.addEventListener('mouseup', mouseup)

  function mousemove(e) {
    if (!eventRef.value) return
    eventRef.value.style.cursor = 'move'
    eventRef.value.style.width = '100%'
    eventRef.value.style.zIndex = 100
    eventRef.value.style.left = '0'
    // handle movement between days
    if (activeView.value === 'Week') {
      handleHorizontalMovement(e.clientX, rect)
    }

    // handle movement within the same day
    handleVerticalMovement(e.clientY, prevY)

    prevY = e.clientY
    if (
      oldEvent.from_time !== calendarEvent.value.from_time &&
      oldEvent.to_time !== calendarEvent.value.to_time
    ) {
      isEventUpdated.value = true
    } else {
      isEventUpdated.value = false
    }
  }

  function mouseup() {
    isRepositioning.value = false
    if (!eventRef.value) return

    eventRef.value.style.cursor = 'pointer'
    eventRef.value.style.width = '90%'

    if (calendarEvent.value.date !== updatedDate.value) {
      isEventUpdated.value = true
    }
    if (isEventUpdated.value) {
      calendarEvent.value.date = updatedDate.value
      updateEventState(calendarEvent.value)
      isEventUpdated.value = false
    }

    window.removeEventListener('mousemove', mousemove)
    window.removeEventListener('mouseup', mouseup)
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

function handleHorizontalMovement(clientX, rect) {
  const currentDate = new Date(
    eventRef.value.parentNode.getAttribute('data-date-attr')
  )
  const leftPadding = currentDate.getDay()
  const rightPadding = 6 - currentDate.getDay()

  let eventWidth = eventRef.value.clientWidth
  let diff = Math.floor((clientX - rect.left) / eventWidth)
  if (diff < -leftPadding) {
    diff = -leftPadding
  } else if (diff > rightPadding) {
    diff = rightPadding
  }
  //TODO: find diff based on leftPadding and rightPadding of Days
  let xPos = Math.ceil(diff * eventWidth)

  if (eventRef.value.style.transform !== `translateX(${xPos}px)`) {
    eventRef.value.style.transform = `translateX(${xPos}px)`
  }
  updatedDate.value = parseDate(getDate(currentDate, diff))
}

function handleVerticalMovement(clientY, prevY) {
  let diffY = clientY - prevY
  diffY = Math.round(diffY / 18) * 18

  const [oldFromTime, oldToTime] = [
    calendarEvent.value.from_time,
    calendarEvent.value.to_time,
  ]

  const [newFromTime, newToTime] = newEventDuration(diffY)

  if (oldFromTime === newFromTime && oldToTime === newToTime) return
  calendarEvent.value.from_time = newFromTime
  calendarEvent.value.to_time = newToTime
}

const toggle = () => (opened.value = !opened.value)
const close = () => (opened.value = false)

function handleBlur(e) {
  eventRef.value.style.zIndex = props.event.idx + 1
}

const deleteEvent = inject('deleteEvent')
function handleEventEdit() {}

function handleEventDelete() {
  deleteEvent(calendarEvent.value.id)
}
</script>
