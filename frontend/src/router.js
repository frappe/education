import { createRouter, createWebHistory } from 'vue-router'
import { session } from './data/session'
import { userResource } from '@/data/user'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
  },
  {
    name: 'Login',
    path: '/account/login',
    component: () => import('@/pages/Login.vue'),
  },
  {
    path: '/schedule',
    name: 'Schedule',
    component: () => import('@/pages/Schedule.vue'),
  },
  {
    path:'/grades',
    name:'Grades',
    component: () => import('@/pages/Grades.vue'),
  },
  {
    path:"/fees",
    name:"Fees",
    component: () => import('@/pages/Fees.vue'),
  },
  {
    path:"/attendance",
    name:"Attendance",
    component: () => import('@/pages/Attendance.vue'),
  },
  {
    path:"/leaves",
    name:"Leaves",
    component: () => import('@/pages/Leaves.vue'),
  },
  {
    path:"/profile",
    name:"Profile",
    component: () => import('@/pages/Profile.vue'),
  }

]

let router = createRouter({
  history: createWebHistory('/education'),
  routes,
})

router.beforeEach(async (to, from, next) => {
  let isLoggedIn = session.isLoggedIn
  try {
    await userResource.promise
  } catch (error) {
    isLoggedIn = false
  }

  if (to.name === 'Login' && isLoggedIn) {
    next({ name: 'Home' })
  } else if (to.name !== 'Login' && !isLoggedIn) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
