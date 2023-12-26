import { createRouter, createWebHistory } from 'vue-router'
import { usersStore } from '@/stores/user'
import { sessionStore } from '@/stores/session'
import { studentStore } from '@/stores/student'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
    props: true,
  },
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
    props: true,

  },
  {
    path:'/grades',
    name:'Grades',
    component: () => import('@/pages/Grades.vue'),
    props: true,

  },
  {
    path:"/fees",
    name:"Fees",
    component: () => import('@/pages/Fees.vue'),
    props: true,

  },
  {
    path:"/attendance",
    name:"Attendance",
    component: () => import('@/pages/Attendance.vue'),
    props: true,
  },
  {
    path:"/attendance/:course",
    name:"Attendance Detail",
    component: () => import('@/pages/AttendanceDetail.vue'),
    props: true,
  },
  {
    path:"/leaves",
    name:"Leaves",
    component: () => import('@/pages/Leaves.vue'),
    props: true,

  },
  {
    path:"/profile",
    name:"Profile",
    component: () => import('@/pages/Profile.vue'),
    props: true,
  },
  {
    path:'/notes',
    name:'Notes',
    component: () => import('@/pages/SchoolDiary.vue'),
    props: true,
  }

]

let router = createRouter({
  history: createWebHistory('/education'),
  routes,
})


router.beforeEach(async (to, from) => {
  const { isLoggedIn, user:sessionUser } = sessionStore()
  const { user } = usersStore()
  const { student } = studentStore()

  if (user.data.length === 0) { 
    user.reload()
  }
  
  // if (student.data === null) {
  //   await student.reload()
  // }
  
  if (!isLoggedIn) {
    window.location.href = '/login'
		return next(false)
  }
})

export default router
