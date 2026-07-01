import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createResource } from 'frappe-ui'
import { portalStore } from '@/stores/portal'

function storedProgramKey(studentId) {
  return `education-active-program-${studentId}`
}

function readStoredProgram(studentId) {
  if (!studentId) return null
  return localStorage.getItem(storedProgramKey(studentId))
}

function writeStoredProgram(studentId, program) {
  if (!studentId) return
  if (program) {
    localStorage.setItem(storedProgramKey(studentId), program)
  } else {
    localStorage.removeItem(storedProgramKey(studentId))
  }
}

export const studentStore = defineStore('education-student', () => {
  const studentInfo = ref({})
  const programs = ref([])
  const activeProgram = ref(null)
  const currentProgram = ref({})
  const studentGroups = ref([])

  const portal = portalStore()

  function studentParams() {
    if (portal.isGuardian && portal.activeStudentId) {
      return { student: portal.activeStudentId }
    }
    return {}
  }

  function resolveStudentId() {
    if (portal.isGuardian) {
      return portal.activeStudentId
    }
    return studentInfo.value?.name
  }

  function reset() {
    studentInfo.value = {}
    programs.value = []
    activeProgram.value = null
    currentProgram.value = {}
    studentGroups.value = []
  }

  function applyProgramContext(data) {
    if (!data) {
      currentProgram.value = {}
      studentGroups.value = []
      return
    }
    currentProgram.value = data.enrollment || {}
    studentGroups.value = data.student_groups || []
  }

  function applyProfile(data) {
    if (!data) {
      reset()
      return null
    }

    studentInfo.value = data.student || {}
    programs.value = data.programs || []

    const studentId = data.student?.name
    const programNames = programs.value.map((p) => p.program)
    let program = readStoredProgram(studentId)

    if (program && !programNames.includes(program)) {
      program = null
      writeStoredProgram(studentId, null)
    }
    if (!program) {
      program = data.suggested_program
    }
    if (!program && programs.value.length) {
      program = programs.value[0].program
    }

    activeProgram.value = program
    if (program) {
      writeStoredProgram(studentId, program)
    }
    return program
  }

  const studentProfile = createResource({
    url: 'education.education.api.get_student_profile',
    makeParams: studentParams,
    onError: (err) => console.warn(err),
  })

  const programContext = createResource({
    url: 'education.education.api.get_program_context',
    makeParams() {
      return {
        ...studentParams(),
        program: activeProgram.value,
      }
    },
    onError: (err) => console.warn(err),
  })

  async function loadProgramContext() {
    if (!activeProgram.value) {
      applyProgramContext(null)
      return
    }
    await programContext.reload()
    applyProgramContext(programContext.data)
  }

  async function loadStudent() {
    if (portal.isGuardian && !portal.activeStudentId) {
      reset()
      return
    }

    await studentProfile.reload()
    const program = applyProfile(studentProfile.data)
    if (program) {
      await loadProgramContext()
    } else {
      applyProgramContext(null)
    }
  }

  async function setActiveProgram(program) {
    const studentId = resolveStudentId()
    if (!program || !studentId) return

    const programNames = programs.value.map((p) => p.program)
    if (!programNames.includes(program)) return

    activeProgram.value = program
    writeStoredProgram(studentId, program)
    await loadProgramContext()
  }

  const student = { reload: loadStudent, fetch: loadStudent }

  function getStudentInfo() {
    return studentInfo
  }
  function getPrograms() {
    return programs
  }
  function getActiveProgram() {
    return activeProgram
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
    programs,
    activeProgram,
    currentProgram,
    studentGroups,
    loadStudent,
    loadProgramContext,
    setActiveProgram,
    getStudentInfo,
    getPrograms,
    getActiveProgram,
    getCurrentProgram,
    getStudentGroups,
  }
})
