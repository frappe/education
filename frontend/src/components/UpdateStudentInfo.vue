<template>
	<div>
		<div class="flex flex-col gap-4">
			<div v-for="section in allFields" :key="section.section"
			>
				<div class="grid grid-cols-3 gap-4">
					<div 
						v-for="field in section.fields" 
						:key="field.name"
						:class='field.hidden && "hidden" '
					>
						<div class="mb-2 text-sm text-gray-600">{{ field.label }}</div>
						<FormControl
							:type='field.type'
							v-model="updatedStudentProfile[field.name]"
							:placeholder="field.label"
							:disabled="field.readonly"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>

import { FormControl,ErrorMessage } from 'frappe-ui';
import { onMounted, reactive, ref,computed, watch } from 'vue';


const props = defineProps({
	updatedStudentProfile: {
		type: Object,
		required: true,
 	},
	editMode: {
		type: Boolean,
	}
})


const allFields = computed(()=> [
	{
		section:'section 1',
		fields:[
			{
				label: 'Student ID',
				name: 'name',
				type: 'data',
				readonly:true
			},
			{				
				label:'Joining Date',
				name:'joining_date',
				type:'data',
				readonly:true
			},
			{
				label: 'Email ID',
				name: 'email_id',
				type: 'data',
				readonly:true
			},
		]
	},
	{
		section:'section 2',
		fields:[
			{
				label: 'First Name',
				name: 'first_name',
				type: 'data',
				readonly:props.editMode
			},
			{
				label: 'Middle Name',
				name: 'middle_name',
				type: 'data',
				readonly:props.editMode
			},
			{
				label: 'Last Name',
				name: 'last_name',
				type: 'data',
				readonly:props.editMode
			},
		]
	},
	{
		section:'section 3',
		fields:[
			{				
				label:'Mobile Number',
				name:'student_mobile_number',
				type:'data',
				readonly:props.editMode
			},
			{				
				label:'Date Of Birth',
				name:'date_of_birth',
				type:'data',
				readonly:props.editMode
			},
			{
				label:'Gender',
				name:'gender',
				type:'data',
				readonly:props.editMode
			},
		]
	},
	{
		section:'section 4',
		fields: [
			{
				label:'Blood Group',
				name:'blood_group',
				type:'data',
				readonly:props.editMode
			},
			{
				label:'Nationality',
				name:'nationality',
				type:'data',
				readonly:props.editMode
			}
		]
	}
])




</script>
