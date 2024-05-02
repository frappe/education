<template>
  <div class="w-full h-full">
    <Calendar
      v-if="!scheduleResource.loading && scheduleResource.data"
      :events="events"
      :config="{
        defaultMode: 'Week',
        scrollToHour: 8,
        eventIcons: eventIcons,
        isEditMode: true,
      }"
      @updateEvent="updateEvent"
      @createEvent="createEvent"
    />
  </div>
</template>

<script setup>
import Calendar from '@/components/Calendar/Calendar.vue'
import { createResource } from 'frappe-ui'
import { ref } from 'vue'
import { studentStore } from '@/stores/student'
const { getCurrentProgram } = studentStore()
import { PhoneCallIcon, MailIcon } from 'lucide-vue-next'

const eventIcons = {
  phone: PhoneCallIcon,
  mail: MailIcon,
}

const programName = ref(getCurrentProgram()?.value?.program)
const events = ref([])

function updateEvent(event) {
  console.log(event)
}
function createEvent(event) {
  console.log('Event Created')
  console.log(event)
}

const scheduleResource = createResource({
  url: 'education.education.api.get_course_schedule_for_student',
  params: { program_name: programName.value },
  onSuccess: (response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        title: classSchedule.title,
        participant: classSchedule.instructor,
        name: classSchedule.name,
        venue: 'Room No: ' + classSchedule.room,
        date: classSchedule.schedule_date,
        from_time: parseTime(classSchedule.from_time),
        to_time: parseTime(classSchedule.to_time),
        color: classSchedule.class_schedule_color,
      })
    })
    events.value = schedule
  },
  auto: true,
})

function parseTime(time) {
  time = time.split('.')[0]

  let [hours, minutes, seconds] = time.split(':')
  if (parseInt(hours) < 10) {
    hours = '0' + hours
  }
  return `${hours}:${minutes}:${seconds}`
}
</script>

<style></style>
