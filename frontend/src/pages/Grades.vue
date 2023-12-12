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
import { Dropdown, FeatherIcon,ListView } from 'frappe-ui';
import { computed, reactive, ref } from 'vue';
const courses = reactive([
    {
      label: 'B.Tech (CSE) 1st Sem',
	},
    {
      label: 'B.Tech (CSE) 2nd Sem',
	},
	{
	  label: 'B.Tech (CSE) 3rd Sem',
    },
    {
      label: 'B.Tech (CSE) 4th Sem',
    },
    {
      label: 'B.Tech (CSE) 5th Sem',
    },
])
courses.forEach((course) => {
	course.onClick = (event) => selected_program.value = event.target.innerText;
})
const selected_program = ref(courses[courses.length - 1 ].label);


const rows = reactive([
	{
		id: 1,
		course: 'DSA',
		unit_test1: "78%",
		unit_test2: "82%",
		sem_end_exam: "-",
	},
	{
		id: 2,
		course: 'JavaScript',
		unit_test1: "78%",
		unit_test2: "82%",
		sem_end_exam: "80%",
	},
])

const columns = reactive([
	{
	  label: 'Course',
	  key: 'course',
	  width: 1,
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
])


</script>
<style lang="">
	
</style>