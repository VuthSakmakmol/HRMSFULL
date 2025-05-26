import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const routes = [
  { path: '/login', component: Login },

  {
    path: '/',
    component: DefaultLayout, // ✅ Your layout with sidebar/topbar
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'users', component: () => import('@/views/UserManagement.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
