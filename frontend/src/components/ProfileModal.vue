<template>
	<Dialog
		v-model="showProfileDialog"
		:options="dialogOptions"
	>
		<template #body>
			<div class="bg-white px-4 pb-6 pt-5 sm:px-6">
				<div class="mb-5 flex items-center justify-between">
					<div>
						<h3 class="text-2xl font-semibold leading-6 text-gray-900">
						  {{ dialogOptions.title || 'Untitled' }}
						</h3>
					  </div>
					  <div class="flex items-center gap-1">
						<Button
						  v-if="detailMode"
						  variant="ghost"
						  class="w-7"
						  @click="detailMode = false"
						>
						  <FeatherIcon name="edit" class="h-4 w-4" />
						</Button>
						<Button variant="ghost" class="w-7" 
							@click="closeModal"
						>
						  <FeatherIcon name="x" class="h-4 w-4" />
						</Button>
					  </div>
				</div>
				<div>
					<div v-if="detailMode" class="flex flex-col gap-3.5">
						<div class="flex gap-3 items-center">
							<Avatar
							size="3xl"
							class="h-12 w-12"
							:label="updatedStudentProfile.student_name"
							:image="null"
						  />

						  <div>
							<p>{{updatedStudentProfile.student_name}}</p>
							<p>{{ updatedStudentProfile.email_id }}</p>
						  </div>
						</div>
						<div v-for="info in infoFormat" class="flex items-center">
							<p class="text-sm text-gray-600">{{ info.label }}:&nbsp</p>
							<p class=" text-gray-900">{{ info.value }}</p>
						</div>
					</div>

					<div v-else>
						<UpdateStudentInfo 
							:updatedStudentProfile="updatedStudentProfile" :editMode="editMode" 
						/>
					</div>
				</div>
			</div>

			<div v-if="!detailMode" class="px-4 pb-7 pt-4 sm:px-6">
				<div class="space-y-2">
				  <Button
					class="w-full"
					v-for="action in dialogOptions.actions"
					:key="action.label"
					v-bind="action"
				  >
					{{ action.label }}
				  </Button>
				</div>
			  </div>
		</template>
		<!-- <template #body-content>
			<div v-if="detailMode">
				<h1>Conditionally</h1>
			</div>
			<UpdateStudentInfo 
				v-if="!detailMode"
				:updatedStudentProfile="updatedStudentProfile" :editMode="editMode" 
			/>
		</template> -->

	</Dialog>
</template>

<script setup>

import { Dialog,FeatherIcon,Avatar } from 'frappe-ui'
import { computed, inject, ref } from 'vue'
import UpdateStudentInfo from './UpdateStudentInfo.vue';
import { studentStore } from '@/stores/student';	
const { getStudentInfo } = studentStore() 

const showProfileDialog = inject('showProfileDialog')

const studentInfo = getStudentInfo().value

console.log(studentInfo)

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
	student_name:studentInfo.student_name,
})

const infoFormat = [
	{
		label:'Mobile Number',
		value: updatedStudentProfile.value.student_mobile_number,
	},
	{
		label: 'Joining Date',
		value: updatedStudentProfile.value.joining_date,
	},
	{
		label: 'Date of Birth',
		value: updatedStudentProfile.value.date_of_birth,
	},
	{
		label: 'Blood Group',
		value: updatedStudentProfile.value.blood_group,
	},
	{
		label:'Gender',
		value: updatedStudentProfile.value.gender
	},
	{
		label:'Nationality',
		value:updatedStudentProfile.value.nationality
	}
]

const editMode = ref(true)
const detailMode = ref(true)


const dialogOptions = computed(() => {
  let title = detailMode.value
    ? 'Profile'
    : 'Update Profile'
  let size = detailMode.value ? '' : 'xl'
  let actions = detailMode.value
    ? []
    : [
        {
			label: 'Save', 
			variant: 'solid',
          	onClick: () => handleStudentProfileUpdate(),
        },
      ]
	
  return { title, size, actions }
})

const handleStudentProfileUpdate = () => {
	closeModal()
} 

const closeModal = () => {
	showProfileDialog.value = false;
	setTimeout(() => {
		detailMode.value = true
	}, 300);
}


</script>

<style>
	
</style>