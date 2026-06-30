<template>
  <div class="py-4 flex flex-col">
    <div class="px-5 flex items-center gap-2">
      <h2 class="font-semibold text-2xl">{{ programName }}</h2>
      <Dropdown v-if="allStudentGroups?.length" :options="allStudentGroups">
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
      <template #actions>
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
import { reactive, ref, watch } from 'vue'
import { leaveStore } from '@/stores/leave'
import { studentStore } from '@/stores/student'
import { Dialog, createResource, Dropdown, FeatherIcon } from 'frappe-ui'
import { storeToRefs } from 'pinia'
import NewLeave from '@/components/NewLeave.vue'
import Calendar from '@/components/Calendar.vue'
import { createToast } from '@/utils'

const { studentInfo, currentProgram, studentGroups } = storeToRefs(
  studentStore()
)
const programName = ref('')
const { isAttendancePage } = storeToRefs(leaveStore())

const selectedGroup = ref('Select Student Group')
const allStudentGroups = ref([])

const newLeave = reactive({
  student: '',
  student_name: '',
  from_date: '',
  to_date: '',
  reason: '',
  total_days: '',
})

watch(
  studentInfo,
  (info) => {
    newLeave.student = info?.name || ''
    newLeave.student_name = info?.student_name || ''
  },
  { immediate: true, deep: true }
)

const attendanceStatus = {
  Present: 'bg-green-100',
  Absent: 'bg-red-200',
  Leave: 'bg-orange-100',
}

const attendanceResource = createResource({
  url: 'education.education.api.get_student_attendance',
  makeParams() {
    return {
      student_group: selectedGroup.value,
      student: studentInfo.value?.name,
    }
  },
  transform: (attendance) => {
    attendance = attendance.filter(
      (row, index, self) => index === self.findIndex((t) => t.date === row.date)
    )

    return attendance.map((row) => ({
      name: row.name,
      title: row.status,
      background_color: attendanceStatus[row.status],
      date: row.date,
      status: row.status,
    }))
  },
  onError: (err) => {
    console.warn('Error', err)
  },
})

const applyLeave = createResource({
  url: 'education.education.api.apply_leave',
  makeParams() {
    return {
      leave_data: newLeave,
      program_name: currentProgram.value?.program,
    }
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
      title: err.messages?.[0] ?? 'Error Occured',
      icon: 'x',
      iconClasses: 'text-red-600',
    })
  },
})

function setStudentGroup() {
  const groups = (studentGroups.value || []).map((group) => ({
    label: group.label,
    onClick: () => {
      if (group.label === selectedGroup.value) return
      selectedGroup.value = group.label
      attendanceResource.reload()
    },
  }))

  allStudentGroups.value = groups
  selectedGroup.value = groups[0]?.label || 'Select Student Group'

  if (groups.length && studentInfo.value?.name) {
    attendanceResource.reload()
  }
}

watch(
  [currentProgram, studentGroups, studentInfo],
  () => {
    programName.value = currentProgram.value?.program || ''
    if (currentProgram.value?.program && studentGroups.value?.length) {
      setStudentGroup()
    } else {
      allStudentGroups.value = []
      selectedGroup.value = 'Select Student Group'
    }
  },
  { deep: true, immediate: true }
)
</script>
