import { createRouter, createWebHistory } from 'vue-router'
import { usersStore } from '@/stores/user'
import { sessionStore } from '@/stores/session'
import { studentStore } from '@/stores/student'
import { portalStore } from '@/stores/portal'

const routes = [
  { path: '/', redirect: '/schedule' },
  {
    path: '/students',
    name: 'Students',
    component: () => import('@/pages/Students.vue'),
  },
  {
    path: '/schedule',
    name: 'Schedule',
    component: () => import('@/pages/Schedule.vue'),
  },
  {
    path: '/grades',
    name: 'Grades',
    component: () => import('@/pages/Grades.vue'),
  },
  {
    path: '/fees',
    name: 'Fees',
    component: () => import('@/pages/Fees.vue'),
  },
  {
    path: '/attendance',
    name: 'Attendance',
    component: () => import('@/pages/Attendance.vue'),
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/schedule',
  },
]

let router = createRouter({
  history: createWebHistory('/edu-portal'),
  routes,
})

router.beforeEach(async (to) => {
  const { isLoggedIn } = sessionStore()
  const { user } = usersStore()
  const portal = portalStore()
  const student = studentStore()

  if (!isLoggedIn) {
    window.location.href = '/login'
    return false
  }

  if (user.data.length === 0) {
    await user.reload()
  }

  if (!portal.role) {
    await portal.context.reload()
  }

  if (!portal.role) {
    window.location.href = '/app'
    return false
  }

  // Guardians must pick a student before any student-scoped page.
  if (portal.isGuardian && !portal.activeStudentId && to.path !== '/students') {
    return '/students'
  }

  // The cards landing page is guardian-only.
  if (!portal.isGuardian && to.path === '/students') {
    return '/schedule'
  }

  await student.loadStudent()
})

export default router
