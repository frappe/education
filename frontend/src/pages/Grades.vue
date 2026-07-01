<template lang="">
  <div v-if="grades.data?.length > 0">
    <div class="px-5 py-4">
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
import { ListView, createListResource } from 'frappe-ui'
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { studentStore } from '@/stores/student'
import { groupBy } from '@/utils'
import MissingData from '@/components/MissingData.vue'

const { studentInfo, currentProgram } = storeToRefs(studentStore())

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
    student: studentInfo.value?.name,
    program: currentProgram.value?.program,
  },
  onSuccess: (response) => {
    tableData.value.columns = [
      { label: 'Course', key: 'course' },
      { label: 'Batch', key: 'batch' },
    ]
    tableData.value.rows = []

    const conductedExams = groupBy(response, (row) => row.assessment_group)
    const exams = Object.keys(conductedExams)
    updateColumns(exams)
    const courses = groupBy(response, (row) => row.course)
    Object.keys(courses).forEach((course) => {
      const row = {}
      row.course = course
      row.batch = courses[course][0].student_group
      exams.forEach((exam) => {
        const examData = conductedExams[exam].find((r) => r.course === course)
        row[exam] = examData
          ? `${examData.total_score}/${examData.maximum_score}`
          : '-'
      })
      tableData.value.rows.push(row)
    })
  },
})

watch(
  () => [studentInfo.value?.name, currentProgram.value?.program],
  ([student, program]) => {
    if (!student || !program) {
      tableData.value.rows = []
      return
    }
    grades.update({
      filters: {
        student,
        program,
      },
    })
    grades.reload()
  },
  { immediate: true }
)

const updateColumns = (exams) => {
  exams.forEach((exam) => {
    tableData.value.columns.push({
      label: exam,
      key: exam,
    })
  })
}
</script>
