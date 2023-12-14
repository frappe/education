<template>
	<div class="px-5 py-4 flex w-screen h-full gap-2  "
		v-if="student.data"
	>
		<div class=" flex-1 bg-gray-300 flex flex-col items-center gap-2 pt-4 rounded overflow-x-hidden overflow-y-scroll">
			<div class="flex items-center justify-between px-2 w-full">
				<Avatar
					shape="circle"
					:image="student.data.profile_image"
					:label="student.data.first_name"
					size="3xl"
					class="w-24 h-24"
				/>
				<div class="h-full">
					<Button
						variant="solid"
						theme="gray"
						size="sm"
						label="Edit Details?"
						@click="isEditEnabled = !isEditEnabled"
					/>					
				</div>

			</div>
			<div class=" w-full flex flex-col gap-2 pb-2 px-2">
				<FormControl
					type="text"
					label="Name"
					v-model="studentInfo.name"
				/>
			</div>
			<!-- button with save -->
			<Button
				variant="solid"
				theme="gray"
				size="sm"
				label="Save"
				@click="saveDetails"
				v-if="isEditEnabled"
			/>
		</div>
		<div class="flex-[2_2_0%] bg-gray-500">
			<h2>jaja</h2>
		</div>
	</div>
</template>

<script setup>
import {studentStore} from '@/stores/student'
import { Avatar, FormControl,Button } from 'frappe-ui';
import { reactive, ref } from 'vue';

const { student } = studentStore()

const studentInfo = reactive({
		name: "",
		student_id: "",
		dob: "",
		country: "",
		joining_date: "",
})

const isEditEnabled = ref(false)


if (student.data) {
	studentInfo.name = student.data.student_name
	studentInfo.student_id = student.data.name
	studentInfo.dob = student.data.date_of_birth
	studentInfo.country = student.data.country
	studentInfo.joining_date = student.data.joining_date
}

function saveDetails() {
	console.log(isEditEnabled)
	console.log(studentInfo)
	isEditEnabled.value = false
}
</script>
