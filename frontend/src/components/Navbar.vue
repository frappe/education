<template lang="">
  <header
    class="flex justify-between gap-3 items-center px-5 py-2.5 h-12 border-b"
  >
    <div class="flex gap-3 items-center cursor-pointer min-w-0">
      <h3 class="font-medium text-lg text-gray-900 shrink-0">
        {{ currentRoute }}
      </h3>
      <ProgramSelector v-if="showProgramSelector" />
    </div>
    <div v-if="isStudent" class="flex flex-row gap-2 shrink-0">
      <Button
        v-if="currentRoute === 'Attendance'"
        variant="solid"
        label="Apply for Leave"
        @click="setIsAttendancePage(true)"
        icon-left="plus"
      />
    </div>
  </header>
</template>
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { leaveStore } from '@/stores/leave'
import { portalStore } from '@/stores/portal'
import { studentStore } from '@/stores/student'
import ProgramSelector from '@/components/ProgramSelector.vue'

const router = useRouter()
const currentRoute = computed(() => router.currentRoute.value.name)

const { setIsAttendancePage } = leaveStore()
const { isStudent, isGuardian, activeStudentId } = storeToRefs(portalStore())
const { programs } = storeToRefs(studentStore())

const showProgramSelector = computed(() => {
  if (currentRoute.value === 'Students') return false
  if (isGuardian.value && !activeStudentId.value) return false
  return programs.value.length > 0
})
</script>
