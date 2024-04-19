<template>
  <div
    class="flex h-full flex-col justify-between transition-all duration-300 ease-in-out"
    :class="isSidebarCollapsed ? 'w-12' : 'w-56'"
  >
    <div class="flex flex-col overflow-hidden">
      <UserDropdown
        class="p-2"
        :isCollapsed="isSidebarCollapsed"
        :educationSettings="
          !educationSettings.loading && educationSettings.data
        "
      />
      <div class="flex flex-col overflow-y-auto">
        <SidebarLink
          :label="link.label"
          :to="link.to"
          v-for="link in links"
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
import { useStorage } from '@vueuse/core'
import SidebarLink from '@/components/SidebarLink.vue'
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  Banknote,
  UserCheck,
  ArrowLeftToLine,
  BookOpen,
} from 'lucide-vue-next'

import UserDropdown from './UserDropdown.vue'
import { createResource } from 'frappe-ui'

const links = [
  // {
  // 	label: 'Dashboard',
  // 	to: '/',
  // 	icon: LayoutDashboard,
  // },
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
  // {
  // 	// TODO: create School Diary Page with card like CRM and from ListView go to Resource Document of each Card
  // 	label: 'Notes',
  // 	to: '/notes',
  // 	icon: BookOpen,
  // },
  // {
  // 	label: 'Profile',
  // 	to: '/profile',
  // 	icon: User,
  // },
]

const isSidebarCollapsed = useStorage('sidebar_is_collapsed', false)

// create a resource which call the function get_school_abbr_logo in api file using createResource
const educationSettings = createResource({
  url: 'education.education.api.get_school_abbr_logo',
  auto: true,
})
</script>
