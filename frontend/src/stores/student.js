import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createResource } from 'frappe-ui'
import { portalStore } from '@/stores/portal'

export const studentStore = defineStore('education-student', () => {
  const studentInfo = ref({})
  const currentProgram = ref({})
  const studentGroups = ref([])

  const portal = portalStore()

  function setInfo(info) {
    if (!info) {
      studentInfo.value = {}
      currentProgram.value = {}
      studentGroups.value = []
      return
    }
    currentProgram.value = info.current_program || {}
    studentGroups.value = info.student_groups || []
    const rest = { ...info }
    delete rest.current_program
    delete rest.student_groups
    studentInfo.value = rest
  }

  // Logged-in student viewing their own record.
  const selfStudent = createResource({
    url: 'education.education.api.get_student_info',
    onSuccess: setInfo,
    onError: (err) => console.warn(err),
  })

  // Guardian viewing the currently selected student
  const guardianStudent = createResource({
    url: 'education.education.api.get_student_context',
    makeParams() {
      return { student: portal.activeStudentId }
    },
    onSuccess: setInfo,
    onError: (err) => console.warn(err),
  })

  async function loadStudent() {
    if (portal.isGuardian) {
      if (!portal.activeStudentId) {
        setInfo(null)
        return
      }
      return guardianStudent.reload()
    }
    if (portal.isStudent) {
      return selfStudent.reload()
    }
  }

  // Backwards-compatible interface: the router and session store call
  // student.reload() to (re)load the active student's context.
  const student = { reload: loadStudent, fetch: loadStudent }

  function getStudentInfo() {
    return studentInfo
  }
  function getCurrentProgram() {
    return currentProgram
  }
  function getStudentGroups() {
    return studentGroups
  }

  return {
    student,
    studentInfo,
    currentProgram,
    studentGroups,
    loadStudent,
    getStudentInfo,
    getCurrentProgram,
    getStudentGroups,
  }
})
