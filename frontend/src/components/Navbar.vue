<template lang="">
	<header class="flex justify-between gap-3 items-center px-5 py-2.5 h-12 border-b">
		<h3 class="cursor-pointer font-medium text-gray-900 ">
			{{ currentRoute }}
		</h3>
		<div class="flex flex-row gap-2">
			<Button 
			v-if="currentRoute==='Attendance'"
			variant="solid"  
			label="Apply for Leave"
			@click="setIsAttendancePage(true)"
			>
				<template #prefix><FeatherIcon name="plus" class="h-4" /></template>
			</Button>
		</div>
	</header>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {BellDot } from 'lucide-vue-next';
import { FeatherIcon } from 'frappe-ui';
import { leaveStore } from '@/stores/leave';
const router = useRouter();
const currentRoute = computed(() => router.currentRoute.value.name)

const { setIsAttendancePage } = leaveStore()





</script>
<style lang="">
	
</style>