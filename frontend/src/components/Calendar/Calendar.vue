<template>
	<div class="p-5 h-full">
		<div class="flex justify-between mb-2">
			<!-- left side  -->
				<!-- Year, Month -->
			<span class=" text-xl font-medium"> {{ getMonth() +", " + currentYear }}</span>	
			<!-- right side -->
				<!-- actions buttons for calendar -->
				<!-- Increment and Decrement Button, View change button default is months or can be set via props! -->
			<div class="flex gap-x-1">
				<!-- <button class="border-2 border-green-500 p-2">Previous</button> -->
				<Button
					@click="decrementMonth"
					variant="ghost"
					class="h-4 w-4"
					icon="chevron-left"
				/>
				<Button
					@click="incrementMonth"
					variant="ghost"
					class="h-4 w-4"
					icon="chevron-right"
				/>
				<TabButtons
					:buttons="[{ label: 'Day',variant:'solid' },{ label: 'Week',variant:'solid' }, { label: 'Month',variant:'solid' }]"
					class=" ml-2"
					v-model="activeView"
				/>
				
			</div>
		</div>
		<CalendarMonthly
			v-if="activeView === 'Month'"
			:events="events"
			:currentMonthDates="currentMonthDates"
			:daysList="daysList"
			:parsedData="parsedData"
			:currentMonth="currentMonth"
			:currentYear="currentYear"
			:config="props.config"
		/>
		
		<CalendarWeekly
			v-else-if="activeView === 'Week'"
			:events="events"
			:weeklyDates="datesAsWeeks"
			:config="props.config"
			:activeView="activeView"
			:currentMonthDates="currentMonthDates"
		/>

		<CalendarDaily
			v-else
			:events="events"
			:currentMonthDates="parsedData"
			:daysList="daysList"
			:config="props.config"
		/>
	</div>
</template>
<script setup>
import { computed, ref } from 'vue';
import { Button, TabButtons } from 'frappe-ui';
import { groupBy, getCalendarDates } from '@/utils'
import CalendarMonthly from '@/components/Calendar/CalendarMonthly.vue'
import CalendarWeekly from './CalendarWeekly.vue';
import CalendarDaily from './CalendarDaily.vue';

const props = defineProps({
	events: {
		type: Object,
		required: false,
	},
	config:{
		type: Object,
		default: {
			scrollToHour: 15,
			hourHeight: 72,
			redundantCellHeight: 22
		}
	}
})

let activeView = ref('Week')

let currentMonth = ref(new Date().getMonth())
let currentYear = ref(new Date().getFullYear())
let datesAsWeeks = ref([])

let monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

let shortMonthList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

let daysList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


let currentMonthDates = computed(() => {
	let allDates = getCalendarDates(currentMonth.value, currentYear.value)
	// weeklyDates.value = allDates
	let dates = allDates.slice()
	while (dates.length) {
		let week = dates.splice(0, 7)
		datesAsWeeks.value.push(week)
	}
	return allDates
})

let parsedData = computed(()=> groupBy(props.events, (row) => row.date))

function parseDate(date) {
	let dd = date.getDate()
	let mm = date.getMonth() + 1
	let yyyy = date.getFullYear()

	if (dd < 10) dd = '0' + dd;
	if (mm < 10) mm = '0' + mm;
	
	return `${yyyy}-${mm}-${dd}`
}


function getMonth() {
	return monthList[currentMonth.value]
}

function incrementMonth() {
	currentMonth.value++
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




</script>

<style>

</style>
