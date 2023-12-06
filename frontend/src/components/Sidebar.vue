<template>
	<div class="w-56 flex flex-col p-10">
		<button 
			class="text-left mb-2 text-lg "
			v-for="link in links"
			@click="handleClick(link.to)"
		>
			{{ link.label }}
		</button>
	</div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter()
const links = [
	{
		label: 'Dashboard',
		to: '/',
	},
	{
		label: 'Schedule',
		to: 'schedule',
	},
	{
		label: 'Grades',
		to: 'grades',
	},
	{
		label: 'Fees',
		to: 'fees',
	},
	{
		label: 'Attendance',
		to: 'attendance',
	},
	{
		label: 'Leave',
		to: 'leaves',
	},
	{
		label: 'Profile',
		to: 'profile',
	},

]

const handleClick = (url) => {
	router.push(url)
}

</script>
<style>
	
</style>