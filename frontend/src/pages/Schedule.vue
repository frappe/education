<script setup>
import { createResource } from 'frappe-ui';
import { Qalendar } from 'qalendar';
import {onMounted, ref} from 'vue'
import { studentStore } from '@/stores/student';

let events= ref([
    {
      title: "Ralph on holiday",
      with: "Rachel Greene",
      time: { 
        start: "2023-12-06 12:00", 
        end: "2023-12-06 17:00" 
      },
      color: "blue",
      id: "5602b6f589fc"
    }
])


let config = {
  style: {
    fontFamily: 'inherit',
  },

  dayBoundaries: {
    start: 8,
    end: 22,
  },
}

let get_earliest_times_from_events = (events) =>{
  let earliest_times = []
  events.forEach(event => {
    earliest_times.push(event.time.start.split(" ")[1].split(":")[0])
  });
  earliest_times.sort()
  config.dayBoundaries.start = earliest_times[0] - 1
  config.dayBoundaries.end = parseInt(earliest_times[earliest_times.length - 1]) + 6
}
get_earliest_times_from_events(events.value)



const { student,getStudentInfo,getCurrentProgram } = studentStore()

const programName = ref('')

await student.reload()
const program = getCurrentProgram().value
programName.value = program.program


const studentInfo = getStudentInfo().value
console.log(studentInfo.student_email_id)

const parseTime = (date) => date.split(":").slice(0,-1).join(":")

const schedule_doc = createResource({
  url:"education.education.api.get_course_schedule_for_student",
  params:{program_name:programName.value},
  onSuccess:(response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        title:classSchedule.title,
        with:classSchedule.instructor,
        color:classSchedule.color || 'blue',
        id:classSchedule.name,
        time :{ 
          start: `${classSchedule.schedule_date } ${parseTime(classSchedule.from_time) }`, 
          end: `${classSchedule.schedule_date } ${parseTime(classSchedule.to_time) }`
        }
      })
    })
    events.value = schedule
  },
  auto:true 
})

onMounted(() => {
  console.log("rendered")
})

</script>

<template>
	<div class="flex items-center justify-center is-light-mode h-screen">
    <div class="calendar_wrapper">
      <Qalendar 
        :events="events"
        :config="config"
        />
    </div>
	</div>
</template>


<style>
@import "qalendar/dist/style.css";
	
  .calendar_wrapper {
    width: 100%;
    height: 100%;
    max-width: 85%;
    max-height: 700px;
  }
</style>