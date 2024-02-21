<template>
	<div class="px-5 py-4">
		<h2 class=" pl-1 mb-4 font-semibold text-2xl"> {{ courseId }}</h2>
		<ListView
			class="h-[250px]"
			:columns="tableData.columns"
			:rows="tableData.rows"
			:options="{
				selectable: false,
				showTooltip: false,
				onRowClick: row => console.log(row)
			}"
			row-key="id"
		>
			<ListHeader>
				<ListHeaderItem v-for="column in tableData.columns" :key="column.key" :item="column"/>
			</ListHeader>
			<ListRow v-for="row in tableData.rows" :key="row.id" :row="row" v-slot="{column, item}">
				<ListRowItem :item="item" :align="column.align">
					<Badge 
						v-if="column.key === 'status' "
						variant="subtle"
						:theme="item.color"
						size="md"
						:label="item.label"

					/>
				</ListRowItem>
			</ListRow>
			
		</ListView>
	</div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { ListView,ListHeader,ListHeaderItem,ListRow,ListRowItem,Badge } from 'frappe-ui';
import { reactive } from 'vue';
const tableData = reactive({
	rows:[
			{
			id: 1,
			date: '12-12-2023',
			time: '10:00 - 11:00',
			room_number: 'A-101',
			status: {
				label: 'Present',
				color: 'green',
				
			}
		},
		{
			id: 2,
			date: '11-12-2023',
			time: '13:00 - 17:00',
			room_number: 'A-102',
			status: {
				label: 'Absent',
				color: 'red',
			},
		},
	],
	columns:[
		{
		  label: 'Date',
		  key: 'date',
		  width: 1,
		},
		{
			label:"Time",
			key:"time",
			width:1,
		},
		{
			label:'Room Number',
			key:'room_number',
			width:1,
		},
		{
		  label: 'Status',
		  key: 'status',
		  width: 1,
		},
	  ],
})

	// get the course id from the route
	const route = useRoute();
	const courseId = route.params.course;
</script>
