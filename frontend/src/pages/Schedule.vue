<template>
	<div class="w-full h-full">
    <Calendar
      v-if="!scheduleResource.loading && scheduleResource.data"
      :events="events"
    />
	</div>
</template>

<script setup>
import Calendar from '@/components/Calendar.vue'
import { createResource } from 'frappe-ui';
import {ref} from 'vue'
import { studentStore } from '@/stores/student';
const { getCurrentProgram } = studentStore()


const programName = ref(getCurrentProgram()?.value?.program)
const events= ref([])


// function get_earliest_time_from_events(events) {
//   let earliest_times = []
//   events.forEach(event => {
//     earliest_times.push(event.time.start.split(" ")[1].split(":")[0])
//   });
//   earliest_times.sort()
//   config.dayBoundaries.start = parseInt(earliest_times[0]) - 1
//   config.dayBoundaries.end = parseInt(earliest_times[earliest_times.length - 1]) + 7
// }

// function parseTime (date) {
//   return date.split(":").slice(0,-1).join(":")
// } 

const scheduleResource = createResource({
  url:"education.education.api.get_course_schedule_for_student",
  params: {program_name:programName.value},
  onSuccess:(response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        title: classSchedule.title,
        with: classSchedule.instructor,
        // color:classSchedule.color || 'blue',
        color:'green',
        name: classSchedule.name,
        room: classSchedule.room,
        date: classSchedule.schedule_date,
        from_time: classSchedule.from_time,
        to_time: classSchedule.to_time,
      })
    })
    events.value = schedule
  },
  auto:true
})

// take hex code and convert it into the a string of color
// function hexToRgb(hex) {

// }


</script>

<style>
</style>