<template>
	<div class="font-bold">
		{{ getDailyViewDate(currentDate) }}
		<div>
			<div class="border-l-[1px] border-t-[1px] border-b-[1px] h-full w-full overflow-scroll flex" ref="gridRef">

				<!-- Left column -->
				<div class="grid grid-cols-1 h-full w-16 ">
					<span v-for="time in 24"
						class="text-center text-gray-600 font-normal text-sm flex items-end justify-center h-[72px] "
						:style="{ height: `${hourHeight}px` }" />
				</div>

				<!-- Calendar Grid / Right Column -->
				<div class="grid grid-cols-1 w-full pb-2 h-full">
					<div class="border-r-[1px]  relative calendar-column">
						<!-- Top Redundant Cell before time starts for giving the calendar some space -->
						<div class=" w-full border-b-[1px]  border-gray-200 "
							:style="{ height: `${redundantCellHeight}px` }" />
						<!-- Day Grid -->
						<div class="flex relative " v-for="time in twentyFourHourFormat" :data-time-attr="time">
							<div class=" w-full border-b-[1px]  border-gray-200  "
								:style="{ height: `${hourHeight}px` }" />
						</div>
						<CalendarEvent v-for="(calendarEvent, idx) in currentMonthDates[parseDate(currentDate)]"
							class="mb-2 cursor-pointer absolute w-full" :event="calendarEvent" :draggable="false"
							:key="calendarEvent.name" :date="currentDate" :style="setEventStyles(calendarEvent, idx)"
							:stylesProp="setEventStyles(calendarEvent, idx)" @mouseout="(e) => handleBlur(e)" />
						<!-- Current time style  -->
						<div class="pl-2 absolute top-20 w-full z-50 "
							v-if="currentDate.toDateString() === new Date().toDateString()" :style="setCurrentTime">
							<div class=" h-0.5  bg-red-600 current-time relative" />
						</div>
					</div>
				</div>
			</div>
			<!-- <li
		v-if="date === parseDate(currentDate)"
		>{{ currentMonthDates[parseDate(currentDate)] }}</li> -->

		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import CalendarEvent from './CalendarEvent.vue';


const props = defineProps({
	events: {
		type: Object,
		required: false,
	},
	currentMonthDates: {
		type: Array,
		required: true,
	},
	daysList: {
		type: Array,
	},
	config: {
		type: Object,
	}
})

let redundantCellHeight = props.config.redundantCellHeight
let hourHeight = props.config.hourHeight
let minuteHeight = hourHeight / 60
let increaseZIndex = ref(false)

const currentDate = computed(() => new Date())
function parseDate(date) {
	return new Date(date).toLocaleDateString().split('/').reverse().join('-')
}
function getDailyViewDate(date) {
	return props.daysList[date.getDay()] + ", " + date.getDate()
}

let twentyFourHourFormat = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"]
let setCurrentTime = computed(() => {
	let d = new Date()
	let hour = d.getHours()
	let minutes = d.getMinutes()
	let top = (hour * 60 + minutes) * minuteHeight + redundantCellHeight + "px"
	return { top }
})

function setEventStyles(event, index) {
	let diff = calculateDiff(event.from_time, event.to_time)
	let height = (diff * minuteHeight) + "px"
	let top = ((calculateMinutes(event.from_time)) * minuteHeight + redundantCellHeight) + "px"
	return { height, top, zIndex: index }
}

function calculateDiff(from, to) {
	let fromMinutes = calculateMinutes(from)
	let toMinutes = calculateMinutes(to)
	return toMinutes - fromMinutes
}

function calculateMinutes(time) {
	let [hours, minutes] = time.split(":")
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

</script>
