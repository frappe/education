<template lang="">
	<div class="px-5 py-4 ">
		<h2 class=" pl-1 mb-4 font-semibold text-2xl"> {{ programName }}</h2>
		<ListView
			class="h-[250px]"
			:columns="tableData.columns"
			:rows="tableData.rows"
			:options="{
				getRowRoute: (row) => ({name: 'Attendance Detail',params: { course: row.course } }),
				selectable: false,
				showTooltip: false,
			}"
			row-key="id"
		/>
	</div>
</template>
<script setup>
import { onMounted, reactive } from 'vue';
import { sessionStore } from '@/stores/session';
import { ListView } from 'frappe-ui';
const { user } = sessionStore();

const programName = 'B.Tech';

const tableData = reactive({
	rows:[
			{
			id: 1,
			course: 'DSA',
			classes_conducted: 20,
			leave: 5,
			total_classes: 30,
			attendance: '75%'
			},
			{
			id: 2,
			course: 'JavaScript',
			classes_conducted: 20,
			leave: 2,
			total_classes: 30,
			attendance:'90%'
			},
	],
	columns:[
		{
		  label: 'Course',
		  key: 'course',
		  width: 1,
		},
		{
		  label: 'Classes Conducted',
		  key: 'classes_conducted',
		  width: '200px',
		},
		{
		  label: 'Leave',
		  key: 'leave',
		},
		{
		  label: 'Total Classes',
		  key: 'total_classes',
		},
		{
		  label: 'Attendance %',
		  key: 'attendance',
		}
	],
	  
})

onMounted(() => {
	console.log(user)
})

</script>
<style lang="">
	
</style>