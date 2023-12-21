<template lang="">
	<div>
		<Button
			variant="primary"
			theme='green'
		@click='feesResource.get_fees.submit({ student: "STU-00001" })'
		>Send Email</Button>
	</div>
</template>
<script setup>
import { createDocumentResource, Button } from 'frappe-ui';

let feesResource = await createDocumentResource({
  doctype: 'Fees',
  name: 'EDU-FEE-2023-00015',
  whitelistedMethods: {
	get_fees: 'get_fees'
  },
  onError: (error) => {
	console.log(error)
  },
  onSuccess: async (response) => {
	let x = await feesResource.get_fees.submit({student:"STU-00001"})
	console.log(x)
  },
})



// feesResource.get_fees.submit({student:"STU-00001"})




</script>
<style lang="">
	
</style>