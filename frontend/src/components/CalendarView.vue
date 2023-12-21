<template>
    <div class="calendar_wrapper is-light-mode">
		<Qalendar 
		  v-if="!schedule_doc.loading  && schedule_doc.data"
		  :events="events"
		  :config="config"
		  />
	  </div>
</template>

<script setup>
import { createResource } from 'frappe-ui';
import { Qalendar } from 'qalendar';
import {onMounted, ref} from 'vue'
import { studentStore } from '@/stores/student';

const props = defineProps({
	calendarViewType: {
		type: String,
	}
})

const { student, getCurrentProgram } = studentStore()

const programName = ref('')

await student.reload()
const program = getCurrentProgram().value
programName.value = program.program


let events= ref([])

let config = {
  style: {
    fontFamily: 'inherit',
  },
  dayBoundaries: {
    start: 8,
    end: 22,
  },
}
let get_earliest_time_from_events = (events) =>{
  let earliest_times = []
  events.forEach(event => {
    earliest_times.push(event.time.start.split(" ")[1].split(":")[0])
  });
  earliest_times.sort()
  config.dayBoundaries.start = parseInt(earliest_times[0]) - 1
  config.dayBoundaries.end = parseInt(earliest_times[earliest_times.length - 1]) + 6
}

const parseTime = (date) => date.split(":").slice(0,-1).join(":")
const schedule_doc = createResource({
  url:"education.education.api.get_course_schedule_for_student",
  params:{program_name:programName.value},
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
    get_earliest_time_from_events(events.value)
  },
})
if (!props.calendarViewType) schedule_doc.reload()
</script>

<style>
@import "qalendar/dist/style.css";
	
  .calendar_wrapper {
    width: 100%;
    height: 100%;
    max-width: 85%;
    max-height: 700px;
  }
</style>