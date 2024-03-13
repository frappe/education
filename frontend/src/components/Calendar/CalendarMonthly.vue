<template>
	<div class="h-[92%] min-h-[600px] min-w-[600px]" v-if="activeView === 'Month' ">
		<!-- Day List -->
		<div class="grid grid-cols-7 w-full pb-2">
			<span v-for="day in daysList" class=" text-center text-gray-600 font-normal text-sm ">{{day}}</span>
		</div>

		<!-- Date Grid -->
		<div class="grid grid-cols-7 border-t-[1px] border-l-[1px] h-full w-full grid-rows-6">
			<div v-for="date in currentMonthDates" class="border-r-[1px] border-b-[1px] border-gray-200">
				<div 
					class="flex justify-center h-full font-normal mx-2"
					:class="currentMonthDate(date) ? 'text-gray-700'  : 'text-gray-200' " 
				>
					<div v-if="currentMonthDate(date)" class="relative flex flex-col items-center w-full overflow-y-auto" > 
						
						<span class="py-1 sticky top-0 bg-white w-full text-center z-10 "
							:class="date.toDateString() === new Date().toDateString() && 'font-bold' "
						>
							{{ date.getDate() }} 
						</span>

						<div class="w-full">
							<CalendarEvent 
								v-for="calendarEvent in parsedData[parseDate(date)]"
								:event="calendarEvent"  
								:date="date"
								class="mb-2 cursor-pointer w-full" 
								:draggable="false"
								:key="calendarEvent.name"
							/>
						</div>

					</div>
					<span v-else >{{ shortMonthList[date.getMonth()] +" "+ date.getDate() }}</span>
				</div>

			</div>
		</div>
		<!-- <div class=" w-20 h-20 bg-orange-400 absolute top-[212px] left">
			
		</div> -->

	</div>
</template>

<script setup>
import { groupBy, getCalendarDates } from '@/utils'
import { computed, ref } from 'vue';
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
	currentMonth: {
		type: Number,
		required: true,
	},
	currentYear: {
		type: Number,
		required: true,
	}
})

let activeView = ref('Month')
let monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
let shortMonthList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
let daysList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


let parsedData = computed(()=> {
	let groupByDate = Object.groupBy(props.events, (row) => row.date)
	let sortedArray = {}
	for (const [key, value] of Object.entries(groupByDate)) {
		let sortedEvents = value.sort((a, b) => a.from_time < b.from_time ? -1 : 1)
		sortedArray[key] = sortedEvents
	}
	return sortedArray
})


function parseDate(date) {
	let dd = date.getDate()
	let mm = date.getMonth() + 1
	let yyyy = date.getFullYear()

	if (dd < 10) dd = '0' + dd;
	if (mm < 10) mm = '0' + mm;
	
	return `${yyyy}-${mm}-${dd}`
}


function currentMonthDate(date) {
	return date.getMonth() === props.currentMonth
}



</script>

<style>
	
</style>