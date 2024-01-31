<template>
	<div class="px-5 py-4">
		<ListView 
			:columns="tableData.columns" 
			:rows="tableData.rows" 
			:options="{
				selectable: false,
				showTooltip: false,
				onRowClick: () =>{}
			}" 
			row-key="id"
			v-if="tableData.rows.length > 0"
		>
			<ListHeader>
				<ListHeaderItem v-for="column in tableData.columns" :key="column.key" :item="column" />
			</ListHeader>
			<ListRow v-for="row in tableData.rows" :key="row.id" :row="row" v-slot="{ column, item }">
				<ListRowItem :item="item" :align="column.align">
					<Badge 
						v-if="column.key === 'status' " 
						variant="subtle" 
						:theme="row.status === 'Paid' ? bg_color='green' : bg_color='red' " size="md"
						:label="item"
					/>
					<Button v-if="column.key === 'cta' && row.status === 'Paid' " variant="subtle" theme="gray" @click='openInvoicePDF(row)'>
						Download Invoice
					</Button>
					<Button v-if="column.key === 'cta' && (row.status === 'Unpaid' || row.status === 'Overdue' ) " variant="solid" theme="gray" @click='openModal(row)'>
						Pay Now
					</Button>
				</ListRowItem>
			</ListRow>
		</ListView>
		<FeesPaymentDialog
			v-if="currentRow"
			:row="currentRow"
			:student="studentInfo"
			v-model="showPaymentDialog"
			@success="success()"
		/>
		<Toast
			v-if="showToast"
			title="Payment Successful"
			text="Your payment has been successfully processed"
			:position='top-left'
			:timeout="5"
			@close="showToast = false"
		/>
		<!-- <FeesPaymentDialog
			v-if="currentRow"
			:row="currentRow"
			:modelValue="showPaymentDialog"
			@update:modelValue="showPaymentDialog = $event"
		/> -->
	</div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { ListView, ListHeader, ListHeaderItem, ListRow, ListRowItem, Badge, createResource, Toast } from 'frappe-ui';
import { reactive, ref } from 'vue';
import FeesPaymentDialog from '../components/FeesPaymentDialog.vue';
import { studentStore } from '@/stores/student';	

const { getStudentInfo  } = studentStore() 
let studentInfo = getStudentInfo().value


const feesResource = createResource({
	url: 'education.education.api.get_student_invoices',
	params: {
		student: studentInfo.name,
	},
	onSuccess: (response) => {
		tableData.rows = response
	},
	auto: true,
})


const tableData = reactive({
	rows: [
		{

			"status": "Unpaid",
			"program": "Class 1",
			"amount": 1250.0,
			"invoice": "ACC-SINV-2024-00013",
			"due_date": "2024-02-01",
			"payment_date": "-"
		},
		{
			"status": "Unpaid",
			"program": "Class 1",
			"amount": 208.34,
			"invoice": "ACC-SINV-2024-00011",
			"due_date": "2024-09-01",
			"payment_date": "-"
		},
		{
			"status": "Paid",
			"program": "Class 1",
			"amount": 208.34,
			"invoice": "ACC-SINV-2024-00008",
			"payment_date": "2024-01-23",
			"due_date": "-"
		},
		{
			"status": "Paid",
			"program": "Class 1",
			"amount": 1250.0,
			"invoice": "ACC-SINV-2024-00001",
			"payment_date": "2024-01-22",
			"due_date": "-"
		}
	],
	columns: [
		{
			label: 'Program',
			key: 'program',
			width: 1,
		},
		{
			label: 'Status',
			key: 'status',
			width: 1,
		},
		{
			label: "Payment Date",
			key: "payment_date",
			width: 1,
		},
		{
			label: 'Due Date',
			key: 'due_date',
			width: 1,
		},
		{
			label: 'Amount',
			key: 'amount',
			width: 1,
		},
		{
			label: 'Invoice',
			key: 'cta',
			width: 1,
		}
	],
})

const currentRow = ref(null)
const showPaymentDialog = ref(false)
const showToast = ref(false)

const openInvoicePDF = (row) => {
	let url = `/api/method/frappe.utils.print_format.download_pdf?
		doctype=${encodeURIComponent("Sales Invoice")}
		&name=${encodeURIComponent(row.invoice)}
		&format=${encodeURIComponent("Standard")}
	`
	window.open(url, '_blank')
}

const openModal = (row) => {
	currentRow.value = row
	showPaymentDialog.value = true
}

const success = () => {
	feesResource.reload()
	// show a toast
	showToast.value = true
}

</script>
