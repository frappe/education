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
        color: classSchedule.class_schedule_color
      })
    })
    events.value = schedule
  },
  auto:true
})

</script>

<style>
</style>