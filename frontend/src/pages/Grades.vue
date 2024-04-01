<template lang="">
  <div v-if="grades.data?.length > 0">
    <div class="px-5 py-4">
      <Dropdown class="mb-4" :options="allPrograms">
        <template #default="{ open }">
          <Button :label="selectedProgram">
            <template #suffix>
              <FeatherIcon
                :name="open ? 'chevron-up' : 'chevron-down'"
                class="h-4 text-gray-600"
              />
            </template>
          </Button>
        </template>
      </Dropdown>
      <ListView
        class="h-[250px]"
        :columns="tableData.columns"
        :rows="tableData.rows"
        :options="{
          selectable: false,
          showTooltip: false,
          onRowClick: () => {},
        }"
        row-key="id"
      />
    </div>
  </div>
  <div v-else>
    <MissingData message="No grades found" />
  </div>
</template>
<script setup>
import {
  Dropdown,
  FeatherIcon,
  ListView,
  createResource,
  createListResource,
} from 'frappe-ui'
import { ref } from 'vue'
import { studentStore } from '@/stores/student'
import { groupBy } from '@/utils'

import MissingData from '@/components/MissingData.vue'

const { getCurrentProgram, getStudentInfo } = studentStore()

let studentInfo = getStudentInfo().value
let currentProgram = getCurrentProgram().value

const allPrograms = ref([])
const selectedProgram = ref('')

const tableData = ref({
  columns: [
    {
      label: 'Course',
      key: 'course',
    },
    {
      label: 'Batch',
      key: 'batch',
    },
  ],
  rows: [],
})

const student_programs = createResource({
  url: 'education.education.api.get_student_programs',
  makeParams() {
    return {
      // student: studentInfo.value?.name
      student: studentInfo.name,
    }
  },
  onSuccess: (response) => {
    let programs = []
    response.forEach((program) => {
      programs.push({
        label: program.program,
        onClick: () => (selectedProgram.value = program.program),
      })
    })
    selectedProgram.value = programs[programs.length - 1].label
    allPrograms.value = programs
  },
  auto: true,
})

const grades = createListResource({
  doctype: 'Assessment Result',
  fields: [
    'name',
    'student_group',
    'course',
    'assessment_group',
    'total_score',
    'maximum_score',
    'grade',
  ],
  filters: {
    student: studentInfo.name,
    program: currentProgram.program,
    // student:"EDU-STU-2023-00005",
    // program:"Comp Science"
  },
  transform: () => {},

  onSuccess: (response) => {
    let conductedExams = groupBy(response, (row) => row.assessment_group)
    let exams = Object.keys(conductedExams)
    updateColumns(exams)
    let courses = groupBy(response, (row) => row.course)
    Object.keys(courses).forEach((course) => {
      let row = {}
      row.course = course
      row.batch = courses[course][0].student_group
      exams.forEach((exam) => {
        let examData = conductedExams[exam].find((row) => row.course === course)
        row[exam] = examData
          ? `${examData.total_score}/${examData.maximum_score}`
          : '-'
      })
      tableData.value.rows.push(row)
    })
  },
  auto: true,
})

const updateColumns = (exams) => {
  exams.forEach((exam) => {
    let col = {}
    col.label = exam
    col.key = exam
    tableData.value.columns.push(col)
  })
}
</script>
