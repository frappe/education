<template>
	<div class="px-5 py-4 flex w-full h-full gap-2  "
		v-if="studentInfo"
	>
		<div class=" flex-1 bg-gray-300 flex flex-col items-center gap-2 pt-4 rounded overflow-x-hidden overflow-y-scroll">
			<div class="flex items-center justify-between px-2 w-full">
				<Avatar
					shape="circle"
					:image="studentInfo.value?.image"
					:label="studentInfo.value?.student_name"
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
		<div class="flex-[2_2_0%] flex flex-col items-center gap-2">
			<div class="flex-1 bg-red-300  w-full rounded flex items-center justify-center">Hello</div>
			<div class=" flex-[2_2_0%] bg-blue-500 w-full rounded flex items-center justify-center">H2</div>
		</div>
	</div>
</template>

<script setup>
import {studentStore} from '@/stores/student'
import { Avatar, FormControl,Button } from 'frappe-ui';
import { onMounted, reactive, ref,computed } from 'vue';

const { getStudentInfo } = studentStore()
let studentInfo = getStudentInfo()

const isEditEnabled = ref(false)



function saveDetails() {
	isEditEnabled.value = false
}
</script>
