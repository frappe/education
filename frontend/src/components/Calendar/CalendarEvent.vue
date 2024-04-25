<template>
  <div
    v-bind="$attrs"
    class="p-2 rounded-lg h-min-[18px] w-[90%]"
    ref="eventRef"
    :class="colorMap[calendarEvent?.color]?.background_color || 'bg-green-100'"
    :style="setEventStyles"
    @mouseout="(e) => handleBlur(e)"
    @click="(e) => handleClick(e)"
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
    <EventModalContent :calendarEvent="calendarEvent" :date="date" />
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
import { FeatherIcon } from 'frappe-ui'
import NestedPopover from '@/components/NestedPopover.vue'
import UsePopover from '@/components/UsePopover.vue'
import EventModalContent from './EventModalContent.vue'
import {
  useFloating,
  shift,
  flip,
  offset,
  arrow,
  autoUpdate,
  autoPlacement,
} from '@floating-ui/vue'

import { ref, nextTick, inject, computed, watch, onMounted } from 'vue'

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
  let width = isResizing.value || isRepositioning.value ? '100%' : '90%'
  let overlapCount = calendarEvent.value.overlapingCount
  if (overlapCount > 1) {
    width = `${100 / overlapCount}%`
    // left = (100 - parseFloat(width)) * calendarEvent.value.idx + 'px'
    // console.log(left)
  }

  return {
    height,
    top,
    zIndex: calendarEvent.value.idx,
    left,
    // width,
  }
})

const floating = ref(null)
const eventRef = ref(null)
const { floatingStyles, middlewareData } = useFloating(eventRef, floating, {
  placement: activeView.value === 'Day' ? 'top' : 'right',
  middleware: [offset(10), flip(), shift()],
  whileElementsMounted: autoUpdate,
})

const popoverRef = ref(null)
const popper = ref(null)
const opened = ref(false)
const resize = ref(null)
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

const updateEventState = inject('updateEventState')

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

function handleResizeMouseDown(e) {
  isResizing.value = true
  isRepositioning.value = false
  if (isRepositioning.value) return
  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize, { once: true })

  function resize(e) {
    let height_15_min = minuteHeight * 15
    // difference between where mouse is and where event's top is, to find the new height
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

let position = ref('right-start')
function handleClick(e) {
  opened.value = !opened.value

  if (parseFloat(e.screenX) + 320 > screen.width) {
    position.value = 'left-start'
  } else {
    position.value = 'right-start'
  }
  console.log(position.value)
}

function handleBlur(e) {
  // change the event z-index to 0

  // console.log(calendarEvent.value.overlapingCount)
  eventRef.value.style.zIndex = calendarEvent.value.idx
}
</script>
