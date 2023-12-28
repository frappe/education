<template lang="">
	<div class="px-5 py-4">
		<Dropdown
			class="mb-4"
  			:options="allPrograms">
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
			:columns="columns"
			:rows="rows"
			:options="{
				selectable: false,
				showTooltip: false,
				onRowClick: row => console.log(row)
			}"
			row-key="id"
		/>
	</div>
</template>
<script setup>
import { Dropdown, FeatherIcon,ListView, createResource,createListResource } from 'frappe-ui';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { studentStore } from '@/stores/student';
const { getCurrentProgram, getStudentInfo,getStudentGroups} = studentStore() 


let studentInfo = getStudentInfo().value
let currentProgram = getCurrentProgram().value
const allPrograms = ref([])
const selectedProgram = ref("");

const columns = ref([
	{
	  label: 'Course',
	  key: 'course',
	},
	{
		label:'Batch',
		key:'batch',
	}
])

const rows = ref([])



const student_programs = createResource({
	url:"education.education.api.get_student_programs",
	makeParams() {
		return {
			// student: studentInfo.value?.name
			student: studentInfo.name
		}
	},
	onSuccess: (response) => {
		let programs = []
		response.forEach((program) => {
			programs.push({
				label:program.program,
				onClick:() => selectedProgram.value = program.program
			})
		})
		selectedProgram.value = programs[programs.length - 1].label
		allPrograms.value = programs
	},
	auto:true
})

const grades = createListResource({
	doctype: "Assessment Result",
	fields:["name", "student_group", "course", "assessment_group", "total_score", "maximum_score", "grade"],
	filters: {
		// student:studentInfo.name,
		// program:currentProgram.program,
		student:"EDU-STU-2023-00005",
		program:"Comp Science"
	},
	transform:() =>{},
	
	onSuccess:(response) => {
		let data = Object.groupBy(response,row => row.assessment_group)
		let exams = Object.keys(data)
		updateColumns(exams)
		// console.log(response)

		let courses = Object.groupBy(response, row => row.course)
		Object.keys(courses).forEach((course) => {
			let row = {}
			row.course = course
			row.batch = courses[course][0].student_group
			exams.forEach((exam) => {
				let examData = data[exam].find(row => row.course === course)
				row[exam] = examData ? `${examData.total_score}/${examData.maximum_score}` : "-"
			})
			// console.log(row)
			rows.value.push(row)
		})
	},
	auto:true
})

const updateColumns = (exams) => {
	exams.forEach((exam) => {
		let col = {}
		col.label = exam
		col.key = exam
		columns.value.push(col)
	})
}

const updateRows = (data) => {
	let rows = []
	// {
	// id: 1,
	// course: 'DSA',
		// batch: "G1",
		// test1: "A",
		// test2: "B",
		// test3: "C",
	// }
	// this is the format of the row

	Object.keys(data).forEach((exam) => {
	})
}



// const x2 = createResource({
// 	url:"education.education.api.get_course_list_based_on_program",
// 	params:{program_name:selected_program.value},
// 	onSuccess:(response) => {
// 		console.log(response)
// 	},
// })









</script>
<style lang="">
	
</style>