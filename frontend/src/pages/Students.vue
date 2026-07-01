<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900">{{ greeting }}</h1>
      <p class="text-gray-600">Select a student to view their information.</p>
    </div>

    <div
      v-if="portal.students.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <button
        v-for="s in portal.students"
        :key="s.student"
        class="flex items-center gap-4 rounded-lg border bg-white p-4 text-left transition hover:border-gray-400 hover:shadow"
        @click="selectStudent(s)"
      >
        <img
          v-if="s.image"
          :src="s.image"
          :alt="s.student_name"
          class="h-12 w-12 rounded-full object-cover"
        />
        <div
          v-else
          class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 font-medium text-gray-600"
        >
          {{ initials(s.student_name) }}
        </div>
        <div class="min-w-0">
          <p class="truncate font-medium text-gray-900">{{ s.student_name }}</p>
          <p class="truncate text-sm text-gray-500">
            {{ s.student }}
          </p>
          <div>
            <p class="truncate text-sm text-gray-500">
              relation: {{ s.relation || 'Not Specified' }}
            </p>
          </div>
        </div>
      </button>
    </div>

    <div v-else class="text-gray-500">
      No students are linked to your account.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { portalStore } from '@/stores/portal'
import { studentStore } from '@/stores/student'

const router = useRouter()
const portal = portalStore()
const student = studentStore()

const greeting = computed(() => {
  const name = portal.guardianInfo?.guardian_name
  return name ? `Welcome, ${name}` : 'Your students'
})

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

async function selectStudent(s) {
  portal.setActiveStudent(s.student)
  await student.loadStudent()
  router.push('/schedule')
}
</script>

<style></style>
