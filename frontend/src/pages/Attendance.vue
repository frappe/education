<template lang="">
	<div>
		<div class="px-5 py-4 ">
			<h2 class="mb-4 font-semibold text-2xl"> {{ programName }}</h2>
			<ListView
				class="h-[250px]"
				:columns="tableData.columns"
				:rows="tableData.rows"
				:options="{
					getRowRoute: (row) => ({name: 'Attendance Detail',params: { course: row.course } }),
					selectable: false,
					showTooltip: false,
				}"
				row-key="id"
			/>
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
			<template #actions="{ close }">
				<div class="flex flex-row-reverse gap-2">
				<Button variant="solid" label="Save" @click="createNewLeave(close)" />
				</div>
			</template>
		</Dialog>
	</div>
</template>
<script setup>
import { reactive,ref } from 'vue';
import { sessionStore } from '@/stores/session';
import { leaveStore } from '@/stores/leave';
import { Dialog, ListView,ErrorMessage } from 'frappe-ui';
import { storeToRefs } from 'pinia';
import NewLeave from '@/components/NewLeave.vue';

const { user } = sessionStore();

// storeToRefs converts isAttendancePage to a ref, hence achieving reactivity
const { isAttendancePage } = storeToRefs(leaveStore())
// can't get actions by using storeToRefs hence using store
const { setIsAttendancePage } = leaveStore()

const programName = 'B.Tech 5th Sem';
const tableData = reactive({
	rows:[
			{
			id: 1,
			course: 'DSA',
			classes_conducted: 20,
			leave: 5,
			total_classes: 30,
			attendance: '75%'
			},
			{
			id: 2,
			course: 'JavaScript',
			classes_conducted: 20,
			leave: 2,
			total_classes: 30,
			attendance:'90%'
			},
	],
	columns:[
		{
		  label: 'Course',
		  key: 'course',
		  width: 1,
		},
		{
		  label: 'Classes Conducted',
		  key: 'classes_conducted',
		  width: '200px',
		},
		{
		  label: 'Leave',
		  key: 'leave',
		},
		{
		  label: 'Total Classes',
		  key: 'total_classes',
		},
		{
		  label: 'Attendance %',
		  key: 'attendance',
		}
	], 
})
const newLeave = reactive({
	student:user,
	from_date: '',
	to_date: '',
	reason: '',
	total_days: '',
	student_group: '',
	attendance_based_on: '',
	course_schedule: '',
})


const createNewLeave = (close) => {
	// validations
	if (!newLeave.from_date || !newLeave.to_date || !newLeave.total_days || !newLeave.reason) {
		console.log("Error")
	}
	console.log(newLeave)
}





</script>
<style lang="">
	
</style>