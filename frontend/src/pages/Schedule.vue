<template>
  <div class="w-full h-full">
    <Calendar
      v-if="!scheduleResource.loading && scheduleResource.data"
      :events="events"
      :config="{
        defaultMode: 'Week',
        scrollToHour: 8,
        eventIcons: eventIcons,
        isEditMode: false,
      }"
      @updateEvent="updateEvent"
    />
  </div>
</template>

<script setup>
import Calendar from '@/components/Calendar/Calendar.vue'
import { createResource } from 'frappe-ui'
import { ref } from 'vue'
import { studentStore } from '@/stores/student'
import { FeatherIcon } from 'frappe-ui'
const { getCurrentProgram } = studentStore()
import { PhoneCallIcon, MailIcon } from 'lucide-vue-next'

const eventIcons = {
  phone: PhoneCallIcon,
  mail: MailIcon,
}

const programName = ref(getCurrentProgram()?.value?.program)
const events = ref([])

function updateEvent(event) {
  // console.log(event)
}

const scheduleResource = createResource({
  url: 'education.education.api.get_course_schedule_for_student',
  params: { program_name: programName.value },
  onSuccess: (response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        title: classSchedule.title,
        with: classSchedule.instructor,
        name: classSchedule.name,
        room: classSchedule.room,
        date: classSchedule.schedule_date,
        from_time: classSchedule.from_time.split('.')[0],
        to_time: classSchedule.to_time.split('.')[0],
        color: classSchedule.class_schedule_color,
      })
    })
    events.value = schedule
  },
  auto: true,
})
</script>

<style></style>
