<template>
	<div
	  class="flex h-full flex-col justify-between transition-all duration-300 ease-in-out"
	  :class="isSidebarCollapsed ? 'w-12' : 'w-56'"
	>
	  <div class="flex flex-col overflow-hidden">
		<UserDropdown class="p-2" :isCollapsed="isSidebarCollapsed" />
		<div class="flex flex-col overflow-y-auto">
			<SidebarLink
			  :label="link.label"
			  v-for="link in links"
			  :to="link.to"
			  :isCollapsed="isSidebarCollapsed"
			  :icon="link.icon"
			  class="mx-2 my-0.5"
			/>
		</div>
	  </div>
	  <SidebarLink
		:label="isSidebarCollapsed ? 'Expand' : 'Collapse'"
		:isCollapsed="isSidebarCollapsed"
		@click="isSidebarCollapsed = !isSidebarCollapsed"
		class="m-2"
	  >
		<template #icon>
		  <span class="grid h-5 w-6 flex-shrink-0 place-items-center">
			<ArrowLeftToLine
			  class="h-4.5 w-4.5 text-gray-700 duration-300 ease-in-out"
			  :class="{ '[transform:rotateY(180deg)]': isSidebarCollapsed }"
			/>
		  </span>
		</template>
	  </SidebarLink>
	</div>
  </template>
  

<script setup>
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core'
import SidebarLink from '@/components/SidebarLink.vue'
import { LayoutDashboard,CalendarCheck,GraduationCap, Banknote, UserCheck, UserMinus, User,ArrowLeftToLine, BookOpen } from 'lucide-vue-next';

import UserDropdown from './UserDropdown.vue';

const router = useRouter()
const links = [
	{
		label: 'Dashboard',
		to: '/',
		icon: LayoutDashboard,
	},
	{
		label: 'Schedule',
		to: '/schedule',
		icon: CalendarCheck,
	},
	{
		label: 'Grades',
		to: '/grades',
		icon: GraduationCap,
	},
	{
		label: 'Fees',
		to: '/fees',
		icon: Banknote,
	},
	{
		label: 'Attendance',
		to: '/attendance',
		icon: UserCheck,
	},
	{
		// TODO: create School Diary Page with card like CRM and from ListView go to Resource Document of each Card
		label: 'Notes',
		to: '/notes',
		icon: BookOpen,
	},
	// {
	// 	label: 'Profile',
	// 	to: '/profile',
	// 	icon: User,
	// },
]

const isSidebarCollapsed = useStorage('sidebar_is_collapsed', false)

</script>
<style>
	
</style>