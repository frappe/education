<template lang="">
	<div>
		<!-- <Button
			variant="solid"
			theme="gray"
			@click='openInvoicePDF()'
		>
			Download Invoice
		</Button> -->
		<FeeDetail />
		<!-- <Button
			variant="primary"
			theme='green'
		@click='feesResource.get_fees.submit({ student: "STU-00001" })'
		>Send Email</Button> -->
	</div>
</template>
<script setup>
import { createDocumentResource, Button, createResource } from 'frappe-ui';
import FeeDetail from './FeeDetail.vue'
// let feesResource = await createDocumentResource({
//   doctype: 'Fees',
//   name: 'EDU-FEE-2023-00015',
//   whitelistedMethods: {
// 	get_fees: 'get_fees'
//   },
//   onError: (error) => {
// 	console.log(error)
//   },
//   onSuccess: async (response) => {
// 	let x = await feesResource.get_fees.submit({student:"STU-00001"})
// 	console.log(x)
//   },
// })

// const options = createResource({
// //   url: 'frappe.utils.weasyprint.download_pdf',
// //   url: 'frappe.utils.print_format.download_pdf',
//   url: 'frappe.desk.form.utils.get_pdf_link',
//   params: {
//     doctype: "Sales Invoice",
// 	docname:"ACC-SINV-2024-00009",
// 	// print_format:"Standard"
//   },
//   onSuccess: (response) => {
// 	console.log(response)
// 	openInvoicePDF()

// // /api/method/frappe.utils.print_format.download_pdf?doctype=Sales Invoice&name=ACC-SINV-2024-00009&format=Standard&no_letterhead=0

//   },
//   auto: false,
// })



// feesResource.get_fees.submit({student:"STU-00001"})




</script>
<style lang="">
	
</style>