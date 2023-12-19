<template lang="">
	<div class="px-5 py-4">
		<Dropdown
			class="mb-4"
  			:options="courses">
			  <template #default="{ open }">
				<Button :label="selected_program">
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
import { Dropdown, FeatherIcon,ListView, createResource } from 'frappe-ui';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { studentStore } from '@/stores/student';
const { student } = studentStore()

const studentInfo =  await student.reload()
const student_programs = createResource({
	url:"education.education.api.get_student_programs",
	makeParams() {
		return {
			// student: studentInfo.value?.name
			student: studentInfo.name
		}
	},
	transform: (response) => {
		let programs = []
		response.forEach((program) => {
			programs.push({
				label:program.program,
				onClick:() => selected_program.value = program.program
			})
		})
		selected_program.value = programs[programs.length - 1].label
		courses.value = programs
	},
	auto:true
})

// const x2 = createResource({
// 	url:"education.education.api.get_course_list_based_on_program",
// 	params:{program_name:selected_program.value},
// 	onSuccess:(response) => {
// 		console.log(response)
// 	},
// })

const courses = ref([])
courses.value.forEach((course) => {
	course.onClick = (event) => selected_program.value = event.target.innerText;
})
const selected_program = ref("");


const rows = reactive([
	{
		id: 1,
		course: 'DSA',
		unit_test1: "78%",
		unit_test2: "82%",
		sem_end_exam: "-",
		total_grade: "80%"
	},
	{
		id: 2,
		course: 'JavaScript',
		unit_test1: "78%",
		unit_test2: "82%",
		sem_end_exam: "80%",
		total_grade: "80%"
	},
])

const columns = reactive([
	{
	  label: 'Course',
	  key: 'course',
	  width: 2,
	},
	{
	  label: 'Unit Test 1',
	  key: 'unit_test1',
	  width: '200px',
	},
	{
	  label: 'Unit Test 2',
	  key: 'unit_test2',
	},
	{
	  label: 'Sem End Exam',
	  key: 'sem_end_exam',
	},
	{
		label:"Total Grade",
		key:"total_grade",
	}
])


</script>
<style lang="">
	
</style>