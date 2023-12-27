<template>
	<Dialog
		v-model="showProfileDialog"
		:options="{
			title: 'Update Profile',
			actions: [{ label: 'Save', variant: 'solid' }],
		}"
	>
		<template #body-content>
			<UpdateStudentInfo :updatedStudentProfile="updatedStudentProfile" :allowEdit="allowEdit" />
		</template>
		<template #actions="{ close }">
			<div class="flex flex-row-reverse gap-2">
			<Button variant="solid" label="Save" @click="handleStudentProfileUpdate(close)" />
			<Button variant="subtle" label="Edit Details" @click="handleEdit" />
			</div>
		</template>
	</Dialog>
</template>

<script setup>

import { Dialog } from 'frappe-ui'
import { inject, ref } from 'vue'
import UpdateStudentInfo from './UpdateStudentInfo.vue';
import { studentStore } from '@/stores/student';	
const { getStudentInfo } = studentStore() 

const showProfileDialog = inject('showProfileDialog')

const studentInfo = getStudentInfo().value

const updatedStudentProfile = ref({
	name: studentInfo.name,
	first_name:studentInfo.first_name,
	middle_name:studentInfo.middle_name,
	last_name:studentInfo.last_name,
	joining_date:studentInfo.joining_date,
	date_of_birth:studentInfo.date_of_birth,
	blood_group:studentInfo.blood_group ,
	student_mobile_number:studentInfo.student_mobile_number,
	gender:studentInfo.gender,
	nationality:studentInfo.nationality,
	email_id:studentInfo.student_email_id,
})

const allowEdit = ref(true)

const handleStudentProfileUpdate = (close) => {
	close()
} 

const handleEdit = () => {
	allowEdit.value = !allowEdit.value
	console.log(allowEdit)
}

</script>

<style>
	
</style>