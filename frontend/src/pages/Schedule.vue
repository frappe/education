<template>
	<div class="flex items-center justify-center">
    <CalendarView
      v-if="!scheduleResource.loading && scheduleResource.data"
      :calendarViewType="false"
      :events="events"
      :config="config"
    />
	</div>
</template>

<script setup>
import CalendarView from '@/components/CalendarView.vue'
import { createResource } from 'frappe-ui';
import {ref} from 'vue'
import { studentStore } from '@/stores/student';
const { getCurrentProgram } = studentStore()


const programName = ref(getCurrentProgram()?.value?.program)
const events= ref([])

const config = {
  style: {
    fontFamily: 'inherit',
  },
  dayBoundaries: {
    start: 8,
    end: 22,
  },
}

function get_earliest_time_from_events(events) {
  let earliest_times = []
  events.forEach(event => {
    earliest_times.push(event.time.start.split(" ")[1].split(":")[0])
  });
  earliest_times.sort()
  config.dayBoundaries.start = parseInt(earliest_times[0]) - 1
  config.dayBoundaries.end = parseInt(earliest_times[earliest_times.length - 1]) + 7
}

function parseTime (date) {
  return date.split(":").slice(0,-1).join(":")
} 

const scheduleResource = createResource({
  url:"education.education.api.get_course_schedule_for_student",
  params: {program_name:programName.value},
  onSuccess:(response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        title:classSchedule.title,
        with:classSchedule.title.split("by")[1].trim(),
        // color:classSchedule.color || 'blue',
        color:'blue',
        id:classSchedule.name,
        time :{ 
          start: `${classSchedule.schedule_date } ${parseTime(classSchedule.from_time) }`, 
          end: `${classSchedule.schedule_date } ${parseTime(classSchedule.to_time) }`
        }
      })
    })
    events.value = schedule
    get_earliest_time_from_events(schedule)
  },
  auto:true
})


</script>

<style>
</style>