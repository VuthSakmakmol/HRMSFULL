import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const routes = [
  {
    path: '/login',
    component: Login
  },

  // 🌐 General Manager routes
  {
    path: '/gm',
    component: DefaultLayout,
    children: [
      { path: 'dashboard', component: () => import('@/views/GMDashboard.vue') },
      { path: 'users', component: () => import('@/views/UserManagement.vue') }
    ]
  },

  // 🌐 TA routes
  {
    path: '/ta',
    component: DefaultLayout,
    children: [
      { path: 'dashboard', component: () => import('@/views/ta/TADashboard.vue') },
      { path: 'requisitions', component: () => import('@/views/ta/JobRequisition.vue') },
      { path: 'candidates', component: () => import('@/views/ta/Candidate.vue') },
      { path: 'departments', component: () => import('@/views/ta/Department.vue') }
    ]
  },

  // Default and fallback
  { path: '/', redirect: '/login' },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
