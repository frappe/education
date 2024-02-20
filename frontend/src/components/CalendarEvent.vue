<template> 

	<Popover placement="right" v-if="!event.status">
    <template #target="{ togglePopover }">
      <div
        class="w-full p-2 rounded-lg "
        :class="`bg-${event.color || 'green'}-100`"
		@click="togglePopover"
      >
        <div
          class="flex gap-3 relative px-2 items-start"
          :class="event.from_time && `border-l-2 border-${event.color || 'green'}-600`"
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
      </div>
    </template>
    <template #body-main>
      <!-- <div class="p-2">Popover content {{ event.color }}</div> -->
	  
	  <!-- container div -->
	  <div class="flex flex-col gap-5 pt-5 px-6 pb-6">
		
		<!-- heading  -->
		<div class="font-semibold text-xl">{{ event.title }}</div>
		
		<!-- event info container -->
		<div class="flex flex-col gap-4">
			<div class="flex gap-2 items-center">
				<FeatherIcon name="calendar" class="h-4 w-4" />
				<span class="text-sm font-normal"> {{parseDate()}} </span>
			</div>
			<div class="flex gap-2 items-center" v-if="event.with">
				<FeatherIcon name="user" class="h-4 w-4" />
				<span class="text-sm font-normal" > {{ event.with }} </span>
			</div>
			<div class="flex gap-2 items-center" v-if="event.from_time && event.to_time">
				<FeatherIcon name="clock" class="h-4 w-4" />
				<span class="text-sm font-normal" > {{ event.from_time }} - {{ event.to_time }} </span>
			</div>
			<div class="flex gap-2 items-center" v-if="event.room">
				<FeatherIcon name="circle" class="h-4 w-4" />
				<span class="text-sm font-normal"> Room No: &nbsp {{ event.room }} </span>
			</div>
		</div>
	  </div>
	  
    </template>
  </Popover>
		<div
		class="w-full p-2 rounded-lg "
		:class="`bg-${event.color || 'green'}-100`"
		@click="togglePopover"
		v-else
		>
		<div
		class="flex gap-3 relative px-2 items-start"
		:class="event.from_time && `border-l-2 border-${event.color || 'green'}-600`"
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
		</div>
</template>

<script setup>
import { FeatherIcon, Popover } from 'frappe-ui'

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


function parseDate() {
	let date = props.date.toDateString().split(" ").slice(0, 3)
	let day = date[0]
	let eventDate = date[1] + " " + date[2]
	return `${day}, ${eventDate}`
}

// In event check whether the property color is given or not
// if given then use that color
// else if check whether bg-color and border-color both are given or not
// else not given then use default color

// let parsedEvents = Object.groupBy(singleEvent, (row) => row.schedule_date)
// console.log(parsedEvents)
</script>

<style>

</style>
