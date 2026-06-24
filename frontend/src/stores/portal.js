import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createResource } from 'frappe-ui'
import { useStorage } from '@vueuse/core'

export const portalStore = defineStore('education-portal', () => {
  const role = ref(null)
  const guardianInfo = ref({})
  const students = ref([])

  const isGuardian = computed(() => role.value === 'Guardian')
  const isStudent = computed(() => role.value === 'Student')

  // Persisted so a refresh keeps the guardian on the same student
  const activeStudentId = useStorage('education-active_student', null)

  const context = createResource({
    url: 'education.education.api.get_portal_context',
    onSuccess: (data) => {
      if (!data) return
      role.value = data.role
      if (data.role === 'Guardian') {
        guardianInfo.value = data.guardian || {}
        students.value = data.students || []
        const studentIds = students.value.map((s) => s.student)
        if (
          activeStudentId.value &&
          !studentIds.includes(activeStudentId.value)
        ) {
          activeStudentId.value = null
        }
      } else {
        guardianInfo.value = {}
        students.value = []
        // A student always acts on their own record.
        activeStudentId.value = null
      }
    },
    onError(err) {
      console.warn(err)
    },
  })

  function setActiveStudent(studentId) {
    activeStudentId.value = studentId
  }

  function clearActiveStudent() {
    activeStudentId.value = null
  }

  function getGuardianInfo() {
    return guardianInfo
  }

  return {
    role,
    guardianInfo,
    students,
    activeStudentId,
    isGuardian,
    isStudent,
    context,
    setActiveStudent,
    clearActiveStudent,
    getGuardianInfo,
  }
})
