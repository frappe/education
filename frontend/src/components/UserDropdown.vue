<template>
	<Dropdown :options="userDropdownOptions" class="p-2">
		<template v-slot="{ open }">
			<button class="flex h-12 py-2 items-center rounded-md duration-300 ease-in-out" :class="isCollapsed
					? 'px-0 w-auto'
					: open
						? 'bg-white shadow-sm px-2 w-52'
						: 'hover:bg-gray-200 px-2 w-52'
				">
				<div class="w-8 h-8 rounded-full flex items-center justify-center">


					<Avatar v-if="educationSettings?.logo" :image="educationSettings?.logo" shape="circle" size="xl" />
					<School v-else />
				</div>
				<div class="flex flex-1 flex-col text-left duration-300 ease-in-out" :class="isCollapsed
						? 'opacity-0 ml-0 w-0 overflow-hidden'
						: 'opacity-100 ml-2 w-auto'
					">
					<div class="text-base font-medium text-gray-900 leading-none">
						{{ educationSettings?.name || 'Education' }}
					</div>
					<div class="mt-1 text-sm text-gray-700 leading-none">
						{{ user.data.full_name }}
					</div>
				</div>

				<div class="duration-300 ease-in-out" :class="isCollapsed
						? 'opacity-0 ml-0 w-0 overflow-hidden'
						: 'opacity-100 ml-2 w-auto'
					">
					<FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-600" aria-hidden="true" />
				</div>
			</button>
		</template>
	</Dropdown>

	<ProfileModal />
</template>
  
<script setup>

import { Dropdown, FeatherIcon, Avatar } from 'frappe-ui'
import { sessionStore } from '@/stores/session'
import { usersStore } from '@/stores/user';
import { provide, ref } from 'vue'
import ProfileModal from '@/components/ProfileModal.vue'
import { School } from 'lucide-vue-next';

const { user } = usersStore()
const { logout } = sessionStore()
defineOptions({
  inheritAttrs: false
})
const props = defineProps({
	isCollapsed: {
		type: Boolean,
		default: false,
	},
	educationSettings: {
	}
})


const showProfileDialog = ref(false)
provide('showProfileDialog', showProfileDialog)


const userDropdownOptions = [
	{
		icon: 'user',
		label: 'Profile',
		onClick: () => showProfileDialog.value = true,
	},
	{
		icon: 'log-out',
		label: 'Log out',
		onClick: () => logout.submit(),
	},
]

</script>
  