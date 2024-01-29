<template>
	<div class="px-5 py-4">
		<ListView class="h-[250px]" :columns="tableData.columns" :rows="tableData.rows" :options="{
			selectable: false,
			showTooltip: false,
			onRowClick: () =>{}
		}" row-key="id">
			<ListHeader>
				<ListHeaderItem v-for="column in tableData.columns" :key="column.key" :item="column" />
			</ListHeader>
			<ListRow v-for="row in tableData.rows" :key="row.id" :row="row" v-slot="{ column, item }">
				<ListRowItem :item="item" :align="column.align">
					<Badge v-if="column.key === 'status' " variant="subtle" :theme="row.status === 'Paid' ? bg_color='green' : bg_color='red' " size="md"
						:label="item"
					/>
					<Button v-if="column.key === 'cta' && row.status === 'Paid' " variant="subtle" theme="gray" @click='openInvoicePDF(row)'>
						Download Invoice
					</Button>
					<Button v-if="column.key === 'cta' && (row.status === 'Unpaid' || row.status === 'Overdue' ) " variant="solid" theme="gray" @click='openPaymentGateway(row)'>
						Pay Now
					</Button>
				</ListRowItem>
			</ListRow>

		</ListView>
	</div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { ListView, ListHeader, ListHeaderItem, ListRow, ListRowItem, Badge } from 'frappe-ui';
import { reactive } from 'vue';
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

// const data = 

const openInvoicePDF = (row) => {
	let url = `/api/method/frappe.utils.print_format.download_pdf?
		doctype=${encodeURIComponent("Sales Invoice")}
		&name=${encodeURIComponent(row.invoice)}
		&format=${encodeURIComponent("Standard")}
	`
	window.open(url, '_blank')
}

const openPaymentGateway = (row) => {
	console.log(row)
}

</script>

<style></style>