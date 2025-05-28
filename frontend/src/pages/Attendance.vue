<template>
  <div class="py-4 flex flex-col">
    <div class="px-5 flex items-center gap-2">
      <h2 class="font-semibold text-2xl">{{ programName }}</h2>
      <Dropdown :options="allStudentGroups">
        <template #default="{ open }">
          <Button :label="selectedGroup">
            <template #suffix>
              <FeatherIcon
                :name="open ? 'chevron-up' : 'chevron-down'"
                class="h-4 text-gray-600"
              />
            </template>
          </Button>
        </template>
      </Dropdown>
    </div>
    <div class="h-full">
      <Calendar
        v-if="!attendanceResource.loading && attendanceResource.data"
        :events="attendanceResource.data"
      />
      <Calendar v-else :events="[]" />
    </div>
    <Dialog
      v-model="isAttendancePage"
      :options="{
        size: '2xl',
        title: 'Apply Leave',
        actions: [{ label: 'Save', variant: 'solid' }],
      }"
    >
      <template #body-content>
        <NewLeave :newLeave="newLeave" />
      </template>
      <template #actions="{ close }">
        <div class="flex flex-row-reverse gap-2">
          <Button
            :disabled="
              !newLeave.from_date ||
              !newLeave.to_date ||
              !newLeave.total_days ||
              !newLeave.reason
            "
            variant="solid"
            label="Save"
            @click="applyLeave.submit()"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { leaveStore } from '@/stores/leave'
import { studentStore } from '@/stores/student'

import { Dialog, createResource, Dropdown, FeatherIcon } from 'frappe-ui'
import { storeToRefs } from 'pinia'
import NewLeave from '@/components/NewLeave.vue'
import Calendar from '@/components/Calendar.vue'
import { createToast } from '@/utils'

const { getCurrentProgram, getStudentInfo, getStudentGroups } = studentStore()
const programName = ref(getCurrentProgram().value?.program)

let studentInfo = getStudentInfo().value

// storeToRefs converts isAttendancePage to a ref, hence achieving reactivity
const { isAttendancePage } = storeToRefs(leaveStore())

onMounted(() => {
  setStudentGroup()
})

const selectedGroup = ref('Select Student Group')
const allStudentGroups = ref()
function setStudentGroup() {
  allStudentGroups.value = getStudentGroups().value
  allStudentGroups.value.forEach(
    (group) =>
      (group.onClick = () => {
        if (group.label === selectedGroup.value) return
        selectedGroup.value = group.label
        attendanceResource.reload()
      })
  )
  selectedGroup.value =
    allStudentGroups.value[0].label || 'Select Student Group'
  attendanceResource.update({
    params: {
      student_group: selectedGroup.value,
      student: studentInfo.name,
    },
  })
  attendanceResource.reload()
}

const newLeave = reactive({
  student: studentInfo.name,
  student_name: studentInfo.student_name,
  from_date: '',
  to_date: '',
  reason: '',
  total_days: '',
})

const attendanceStatus = {
  Present: 'bg-green-100',
  Absent: 'bg-red-200',
  Leave: 'bg-orange-100',
}

const attendanceResource = createResource({
  url: 'education.education.api.get_student_attendance',
  params: {
    student_group: selectedGroup.value,
    student: studentInfo.name,
  },
  transform: (attendance) => {
    // filter attendance to remove duplicate attendance data
    attendance = attendance.filter(
      (attendance, index, self) =>
        index === self.findIndex((t) => t.date === attendance.date)
    )

    let events = []

    attendance.forEach((attendance) => {
      events.push({
        name: attendance.name,
        title: attendance.status,
        background_color: attendanceStatus[attendance.status],
        date: attendance.date,
        status: attendance.status,
      })
    })
    return events
  },
  onError: (err) => {
    console.log('Error', err)
  },
})

const applyLeave = createResource({
  url: 'education.education.api.apply_leave',
  params: {
    leave_data: newLeave,
    program_name: programName.value,
  },
  onSuccess: () => {
    isAttendancePage.value = false
    attendanceResource.reload()
    createToast({
      title: 'Leave applied successfully',
      icon: 'check',
      iconClasses: 'text-green-600',
    })
  },
  onError: (err) => {
    createToast({
      title: err.messages[0] ?? 'Error Occured',
      icon: 'x',
      iconClasses: 'text-red-600',
    })
  },
})
</script>
