<template>
  <div
    v-bind="$attrs"
    class="p-2 rounded-lg w-full"
    ref="eventRef"
    :class="colorMap[event?.color]?.background_color || 'bg-green-100'"
    @click="updatePosition"
  >
    <div
      class="flex gap-3 relative px-2 items-start h-full overflow-hidden select-none"
      :class="
        event.from_time && [
          'border-l-2',
          colorMap[event?.color]?.border_color || 'border-green-600',
        ]
      "
    >
      <FeatherIcon name="circle" class="h-4 text-black" />

      <div class="flex flex-col whitespace-nowrap w-fit overflow-hidden">
        <p class="font-medium text-sm text-gray-800 text-ellipsis">
          {{ event.title }}
        </p>
        <p
          class="font-normal text-xs text-gray-800 text-ellipsis"
          v-if="event.from_time"
        >
          {{ event.from_time }} - {{ event.to_time }}
        </p>
      </div>
    </div>
    <div
      class="absolute h-[8px] w-[100%] cursor-row-resize"
      ref="resize"
      @mousedown="handleMouseDown"
    ></div>
  </div>

  <div
    ref="popoverRef"
    class="flex flex-col gap-5 pt-5 px-6 pb-6 w-80 bg-white rounded shadow fixed z-20"
    v-show="opened"
  >
    <!-- heading  -->
    <div class="font-semibold text-xl">{{ event.title }}</div>

    <!-- event info container -->
    <div class="flex flex-col gap-4">
      <div class="flex gap-2 items-center">
        <FeatherIcon name="calendar" class="h-4 w-4" />
        <span class="text-sm font-normal"> {{ parseDate(date) }} </span>
      </div>
      <div class="flex gap-2 items-center" v-if="event.with">
        <FeatherIcon name="user" class="h-4 w-4" />
        <span class="text-sm font-normal"> {{ event.with }} </span>
      </div>
      <div
        class="flex gap-2 items-center"
        v-if="event.from_time && event.to_time"
      >
        <FeatherIcon name="clock" class="h-4 w-4" />
        <span class="text-sm font-normal">
          {{ event.from_time }} - {{ event.to_time }}
        </span>
      </div>
      <div class="flex gap-2 items-center" v-if="event.room">
        <FeatherIcon name="circle" class="h-4 w-4" />
        <span class="text-sm font-normal">
          Room No: &nbsp {{ event.room }}
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

import { ref, nextTick, inject } from 'vue'

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  stylesProp: {
    type: Object,
    required: false,
  },
})

const eventRef = ref(null)
const popoverRef = ref(null)
const popper = ref(null)
const opened = ref(false)
const resize = ref(null)

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

function parseDate(date) {
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  return date.toLocaleDateString('en-US', options)
}

let updateEventState = inject('updateEventState')
function handleMouseDown(e) {
  e.preventDefault()
  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize, { once: true })
  function resize(e) {
    eventRef.value.style.height =
      e.clientY - eventRef.value.getBoundingClientRect().top + 'px'
  }
  function stopResize() {
    window.removeEventListener('mousemove', resize)
    newEventDuration(eventRef.value.style.height)
    debugger
    updateEventState({
      calendarEventID: props.event.name,
      date: props.event.date,
      height: eventRef.value.style.height,
    })
  }
}

function newEventDuration(height) {
  let oldHeight = props.stylesProp.height
  let newHeight = height
  let updatedEventDurationHeight = parseFloat(newHeight) - parseFloat(oldHeight)
  debugger
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
