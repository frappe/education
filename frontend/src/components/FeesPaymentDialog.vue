<template>
	<div>
		<Dialog 
			:options="{
				title: 'Pay Fees',
				actions: [{ label: 'Save', variant: 'solid' }],
			}"
			:modelValue="modelValue"
			@update:modelValue="emits('update:modelValue', $event)"
		>
			<template #body-content>
				<div class="flex flex-col gap-4">
					<div v-for="section in allFields" :key="section.section">
						<div class="grid grid-cols-2 gap-4">
							<div 
								v-for="field in section.fields" 
								:key="field.name"
								:class='field.hidden && "hidden" '
							>
								<div class="mb-2 text-sm text-gray-600">{{ field.label }}</div>
								<FormControl
									v-if="field.name === 'mobile_number' || field.name === 'email' "
									:type='field.type'
									v-model="billingDetails[field.name]"
									:placeholder="field.placeholder"
									:disabled="field.readonly"
									@change="validateFields()"
								/>
								<FormControl
									v-else
									:type='field.type'
									v-model="billingDetails[field.name]"
									:placeholder="field.placeholder"
									:disabled="field.readonly"
									@change="validateFields()"
								/>
								<ErrorMessage  
									v-if="field.name ===  'mobile_number' && !isMobilePresent " 
									message="Mobile number is required" class="pt-2" 
								/>
								<ErrorMessage  
									v-if="field.name ===  'email' && !isEmailPresent " 
									message="Email is Required" class="pt-2" 
								/>
							</div>
						</div>
					</div>
				</div>
			</template>
			<template #actions="{ close }">
				<div class="flex flex-row-reverse gap-2 ">

					<Button 
						class="w-48 h-7" 
						variant="solid" 
						@click="openPaymentGateway(close)" 	
						icon-left="external-link"
						:loading="paymentOptions.loading"
						label="Proceed to Payment"
					/>
				</div>
			</template>
		</Dialog>

	</div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue';
import { FormControl, Dialog, createResource, ErrorMessage } from 'frappe-ui';
import { createToast } from '../utils';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: false,
  },
  student:{
	type:Object,
	required:true
  },
  row : {
	type:Object,
	required:true
  }
})
const emits = defineEmits(['update:modelValue','success'])

onMounted(() => {
	const script = document.createElement('script')
	script.src = `https://checkout.razorpay.com/v1/checkout.js`
	document.body.appendChild(script)
})

const paymentOptions = createResource({
	url: 'education.education.billing.get_payment_options',
	makeParams(values) {
		return {
			doctype: "Sales Invoice",
			docname: props.row.invoice,
			phone: billingDetails.mobile_number,
			country: billingDetails.country,
		}
	},
})

const paymentSuccessResource = createResource({
	url: 'education.education.billing.handle_payment_success',
})

const paymentFailureResource = createResource({
	url: 'education.education.billing.handle_payment_failure',
})

function openPaymentGateway (close) {
	if (!billingDetails.mobile_number || !billingDetails.email) {
		validateFields()
		return
	}
	paymentOptions.submit(
		{},
		{
			onSuccess(data) {
				data.handler = (response) => {
					handleSuccess(response, close)
				}

				let rzp = new Razorpay(data)
				rzp.open()
				rzp.on('payment.failed', (response) =>handleFailure(response))
				rzp.on('payment.success', (response) => handleSuccess(response, close))
			},
			onError(err) {
				showError(err)
			},
		}
	)
}

function validateFields () {
	if (!billingDetails.mobile_number) {
		isMobilePresent.value = false
	}
	if (!billingDetails.email) {
		isEmailPresent.value = false
	}

	if (billingDetails.mobile_number && !billingDetails.email) {
		isMobilePresent.value = true
		isEmailPresent.value = false
	}
	if (billingDetails.email && !billingDetails.mobile_number) {
		isEmailPresent.value = true
		isMobilePresent.value = false
	}
	if (billingDetails.email && billingDetails.mobile_number) {
		isEmailPresent.value = true
		isMobilePresent.value = true
	}
}


function handleSuccess (response, close) {
	paymentSuccessResource.submit(
		{
			response: response,
			against_invoice: props.row.invoice,
			billing_details: billingDetails,
		},
		{
			onSuccess(data) {
				close()
				emits('success')
			},
			onError(err) {
				showError(err)
			},
		}
	)
}

function handleFailure (response) {
	paymentFailureResource.submit(
		{
			response: response,
			against_invoice: props.row.invoice,
			billing_details: billingDetails,
		},
		{
			onError(err) {
				showError(err)
			},
		}
	)
}

function showError (err) {
	console.log(err)
	createToast({
		message: 'Something went wrong',
        icon: 'x',
        iconClasses: 'text-red-600',
	})
}

// const isMobilePresent = computed(() => billingDetails.mobile_number ? true : false)
// const isEmailPresent = computed(() => billingDetails.email ? true : false)
const isMobilePresent = ref(true)
const isEmailPresent = ref(true)

const billingDetails = reactive({
	program: props.row.program || "",
	student:props.student.student_name || "",
	amount: props.row.amount || "",
	id: props.student.name || "",
	mobile_number: "",
	email: props.student.student_email_id || "",
	address_line_1: props.student.address_line_1 || "",
	address_line_2: props.student.address_line_2 || "",
	city: props.student.city || "",
	state: props.student.state || "",
	country: props.student.country || "",
	pincode: props.student.pincode || "",
})


const allFields = [
  {
    section: 'Student Details',
    fields: [
		{
			label: 'Student',
			name: 'student',
			type: 'data',
			readonly: true
		},
		{
			label: 'Student',
			name: 'id',
			type: 'data',
			readonly: true
		},
		{
			label: 'Amount',
			name: 'amount',
			type: 'data',
			readonly: true
		},
		{
			label: 'Program',
			name:'program',
			type:'data',
			readonly:true
		},
		{
			label: 'Mobile Number',
			name: 'mobile_number',
			type: 'data',
		},
		{
			label: 'Email',
			name: 'email',
			type: 'data',
		}
	],
  },
  {
    section: 'Student Address',
    fields: [
		{
			label: 'Address Line 1',
			name: 'address_line_1',
			type: 'data',
		},
		{
			label: 'Address Line 2',
			name: 'address_line_2',
			type: 'data',
		},
		{
			label: 'City',
			name: 'city',
			type: 'data',
		},
		{
			label: 'State',
			name: 'state',
			type: 'data',
		},
		{
			label: 'Country',
			name: 'country',
			type: 'data',
		},
		{
			label: 'Pincode',
			name: 'pincode',
			type: 'data',
		}
    ],
  },
]

</script>