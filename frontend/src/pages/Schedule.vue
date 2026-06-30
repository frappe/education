<template>
  <div class="w-full h-full">
    <Calendar v-if="events.length" :events="events" />
    <MissingData v-else message="No schedule found" />
  </div>
</template>

<script setup>
import Calendar from '@/components/Calendar.vue'
import MissingData from '@/components/MissingData.vue'
import { createResource } from 'frappe-ui'
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { studentStore } from '@/stores/student'

const { currentProgram, studentGroups } = storeToRefs(studentStore())
const events = ref([])

const scheduleResource = createResource({
  url: 'education.education.api.get_course_schedule_for_student',
  makeParams() {
    return {
      program_name: currentProgram.value?.program,
      student_groups: studentGroups.value,
    }
  },
  onSuccess: (response) => {
    const schedule = []
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
})

watch(
  [currentProgram, studentGroups],
  () => {
    if (currentProgram.value?.program && studentGroups.value?.length) {
      scheduleResource.reload()
    } else {
      events.value = []
    }
  },
  { deep: true, immediate: true }
)
</script>

<style></style>
