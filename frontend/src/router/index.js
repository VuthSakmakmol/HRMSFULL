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
      { path: 'users', component: () => import('@/views/UserManagement.vue') },
      { path: 'activity-log', component: () => import('@/views/ta/gm/ActivityLog.vue') }
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
      { path: 'departments', component: () => import('@/views/ta/Department.vue') },
      { path: 'roadmap', component: () => import('@/views/ta/Roadmap.vue')},
    ]
  },
  {
  path: '/hrss',
  component: DefaultLayout,
  children: [
    { path: 'employees', component: () => import('@/views/hrss/EmployeeList.vue') },
    { path: 'addemployee', component: () => import('@/views/hrss/AddEmployee.vue') },
    { path: 'attendance', component: () => import('@/views/hrss/EmployeeAttendance.vue') },
    { path: 'evaluate/:id', component: () => import('@/views/hrss/EvaluatePage.vue') },


    

    // Main Employee Dashboard
    { path: 'dashboard', component: () => import('@/views/hrss/dashboard/employees/EmployeeDashboard.vue') },

    // Chart components for optional direct view
    { path: 'dashboard/charts/gender', component: () => import('@/views/hrss/dashboard/employees/charts/GenderBreakdown.vue') },
    { path: 'dashboard/charts/monthly-join', component: () => import('@/views/hrss/dashboard/employees/charts/MonthlyJoinChart.vue') },
    { path: 'dashboard/charts/total', component: () => import('@/views/hrss/dashboard/employees/charts/TotalEmployeesCard.vue') },

    // Attendance Dashboard
    { path: 'dashboard/attendance', component: () => import('@/views/hrss/dashboard/attendance/AttendanceDashboard.vue') },
  ]
}
,


  // Default and fallback
  { path: '/', redirect: '/login' },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
