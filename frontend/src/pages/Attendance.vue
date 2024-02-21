<template>
	<div class="py-4 flex flex-col">

		<div class=" px-5 flex items-center gap-2">
			<h2 class=" font-semibold text-2xl"> {{ programName }}</h2>
			<Dropdown
				:options="allStudentGroups"
				>
				<template #default="{ open }">
					<Button :label="selectedGroup">
						<template #suffix>
							<FeatherIcon
								:name="open ? 'chevron-up' : 'chevron-down'"
								class="h-4 text-gray-600"
							/>
						</template>
					</Button>
				</template>
			</Dropdown>
		</div>
		<div class="h-full">
			<!-- <ListView
				class="h-[250px]"
				:columns="tableData.columns"
				:rows="tableData.rows"
				:options="{
					getRowRoute: (row) => ({name: 'Attendance Detail',params: { course: row.course } }),
					selectable: false,
					showTooltip: false,
				}"
				row-key="id"
			/> -->
			
			<Calendar
				v-if="!attendanceData.loading && attendanceData.data"
				:events="attendanceData.data"
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
				<Button 
					:disabled="!newLeave.from_date || !newLeave.to_date || !newLeave.total_days || !newLeave.reason"
					variant="solid" 
					label="Save" 
					@click="createNewLeave(close)" 
				/>
				</div>
			</template>
		</Dialog>
	</div>
</template>
<script setup>
import { reactive,ref } from 'vue';
import { leaveStore } from '@/stores/leave';
import { studentStore } from '@/stores/student';	

import { Dialog, ListView, createResource, createListResource, Dropdown, FeatherIcon} from 'frappe-ui';
import { storeToRefs } from 'pinia';
import NewLeave from '@/components/NewLeave.vue';
import Calendar from '@/components/Calendar.vue';
import { createToast } from '@/utils'

const { getCurrentProgram, getStudentInfo,getStudentGroups} = studentStore() 
const programName = ref(getCurrentProgram().value?.program)
const selectedGroup = ref('Select Student Group')
const allStudentGroups = ref()


let studentInfo = getStudentInfo().value

// storeToRefs converts isAttendancePage to a ref, hence achieving reactivity
const { isAttendancePage } = storeToRefs(leaveStore())
// can't get actions by using storeToRefs hence using store

// const tableData = reactive({
// 	rows:[
// 			{
// 			id: 1,
// 			course: 'DSA',
// 			classes_conducted: 20,
// 			leave: 5,
// 			total_classes: 30,
// 			attendance: '75%'
// 			},
// 			{
// 			id: 2,
// 			course: 'JavaScript',
// 			classes_conducted: 20,
// 			leave: 2,
// 			total_classes: 30,
// 			attendance:'90%'
// 			},
// 	],
// 	columns:[
// 		{
// 		  label: 'Course',
// 		  key: 'course',
// 		  width: 1,
// 		},
// 		{
// 		  label: 'Classes Conducted',
// 		  key: 'classes_conducted',
// 		  width: '200px',
// 		},
// 		{
// 		  label: 'Leave',
// 		  key: 'leave',
// 		},
// 		{
// 		  label: 'Total Classes',
// 		  key: 'total_classes',
// 		},
// 		{
// 		  label: 'Attendance %',
// 		  key: 'attendance',
// 		}
// 	], 
// })

const newLeave = reactive({
	student:studentInfo.name,
	student_name: studentInfo.student_name,
	from_date: '',
	to_date: '',
	reason: '',
	total_days: '',
})

const attendanceData = createListResource({
	doctype:"Student Attendance",
	fields:['date','status','name'],
	filters: {
		student:studentInfo.name,
		student_group:selectedGroup,
		docstatus:1,
	},
	// cache:selectedGroup.value, STRONG CACHE
	transform: (attendance) => {
		// filter attendance to remove duplicate attendance data
		attendance = attendance.filter((attendance, index, self) =>
			index === self.findIndex((t) => (
				t.date === attendance.date
			))
		)

		let events = []

		attendance.forEach((attendance) => {
			events.push({
				title:attendance.status,
				background_color:attendance.status === "Absent" ? "bg-red-200" : "bg-green-100",
				name:attendance.name,
				date:attendance.date,
				status:attendance.status,
			})
		})
		return events
	}
})


const applyLeave = createResource({
	url:"education.education.api.apply_leave",
	params:{
		leave_data:newLeave,
		program_name:programName.value,
	},
	onSuccess:() => {
		isAttendancePage.value = false
		attendanceData.reload()
		createToast({
			title: 'Attendance Applied Successful',
			icon: 'check',
			iconClasses: 'text-green-600',
		})
	},
	onError:(err) => {
		console.log("Error",err)
		createToast({
			title: 'Something went wrong',
			icon: 'x',
			iconClasses: 'text-red-600',
		})
	},
})

function setStudentGroup() {
	allStudentGroups.value = getStudentGroups().value
	allStudentGroups.value.forEach((group) => group.onClick = () => {
		selectedGroup.value = group.label
		attendanceData.reload()
	})
	selectedGroup.value = allStudentGroups.value[0].label || 'Select Student Group'
	attendanceData.reload()
}
setStudentGroup()

function createNewLeave (close) {
	// validations
	if (!newLeave.from_date || !newLeave.to_date || !newLeave.total_days || !newLeave.reason) {
		// TODO: Disabled button if fields are empty
		console.log("Error")
	}
	applyLeave.submit()
}


</script>