import { createRouter, createWebHistory } from 'vue-router'
import { usersStore } from '@/stores/user'
import { sessionStore } from '@/stores/session'
import { studentStore } from '@/stores/student'

const routes = [
  // {
  //   path: '/',
  //   name: 'Home',
  //   component: () => import('@/pages/Home.vue'),
  // },
  {
    name: 'Login',
    path: '/login',
    component: () => import('@/pages/Login.vue'),
    props: true,
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
    path: "/fees",
    name: "Fees",
    component: () => import('@/pages/Fees.vue'),

  },
  {
    path: "/attendance",
    name: "Attendance",
    component: () => import('@/pages/Attendance.vue'),
  },
  // {
  //   path: "/attendance/:course",
  //   name: "Attendance Detail",
  //   component: () => import('@/pages/AttendanceDetail.vue'),
  //   props: true,
  // },
  {
    path: '/notes',
    name: 'Notes',
    component: () => import('@/pages/SchoolDiary.vue'),
  },
  {
    path :'/:catchAll(.*)',
    redirect: '/schedule',
  }
  // TODO: add star and redirect to schedule page

]

let router = createRouter({
  history: createWebHistory('/education'),
  routes,
})


router.beforeEach(async (to, from) => {
  const { isLoggedIn, user: sessionUser } = sessionStore()
  const { user } = usersStore()
  const { student } = studentStore()

  if (!isLoggedIn) {
    window.location.href = '/login'
    return await next(false)
  }

  if (user.data.length === 0) {
    await user.reload()
  }
  await student.reload()

})

export default router
