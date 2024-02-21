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

let colorMap = {
  blue:{
    background_color:'bg-blue-100',
    border_color:'border-blue-600'
  },
  green:{
    background_color:'bg-green-100',
    border_color:'border-green-600'
  },
  red:{
    background_color:'bg-red-100',
    border_color:'border-red-600'
  },
  orange:{
    background_color:'bg-orange-100',
    border_color:'border-orange-600'
  },
  yellow: {
    background_color:'bg-yellow-100',
    border_color:'border-yellow-600'
  },
  teal: {
    background_color:'bg-teal-100',
    border_color:'border-teal-600'
  },
  violet: {
    background_color:'bg-violet-100',
    border_color:'border-violet-600'
  },
  cyan: {
    background_color:'bg-cyan-100',
    border_color:'border-cyan-600'
  },
  purple: {
    background_color:'bg-purple-100',
    border_color:'border-purple-600'
  },
  pink: {
    background_color:'bg-pink-100',
    border_color:'border-pink-600'
  },
  amber: {
    background_color:'bg-amber-100',
    border_color:'border-amber-600'
  }

}

function colorToTailwindColor (color) {
  if (colorMap.hasOwnProperty(color)) {
    return colorMap[color]
  }
  else{
    return colorMap['green']
  }
}


const scheduleResource = createResource({
  url:"education.education.api.get_course_schedule_for_student",
  params: {program_name:programName.value},
  onSuccess:(response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        title: classSchedule.title,
        with: classSchedule.instructor,
        name: classSchedule.name,
        room: classSchedule.room,
        date: classSchedule.schedule_date,
        from_time: classSchedule.from_time.split(".")[0],
        to_time: classSchedule.to_time.split(".")[0],
        background_color:colorToTailwindColor(classSchedule.class_schedule_color).background_color,
        border_color: colorToTailwindColor(classSchedule.class_schedule_color).border_color
      })
    })
    events.value = schedule
  },
  auto:true
})

</script>

<style>
</style>