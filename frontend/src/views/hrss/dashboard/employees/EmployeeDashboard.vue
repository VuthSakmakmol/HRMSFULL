<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">📊 ManPower</h2>

    <v-row dense>
      <!-- 🔢 Total Employees -->
      <v-col cols="12" sm="4">
        <TotalEmployeesCard
          :total="summary.total"
          :trend="summary.trend"
        />
      </v-col>

      <!-- 👥 Gender Breakdown -->
      <v-col cols="12" sm="4">
        <GenderBreakdownChart
          :data="genderData"
        />
      </v-col>

      <!-- 📈 Monthly Joins -->
      <v-col cols="12" sm="4">
        <MonthlyJoinChart
          :chart-data="monthlyData"
        />
      </v-col>

      <!-- 🗂 Dept & Position by Status -->
      <v-col cols="12" sm="6" md="4">
        <DepartmentPositionStatusChart
          :status-options="statusOptions"
          :initial-status="initialStatus"
          :fetch-data="fetchDeptPosData"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

// existing charts
import TotalEmployeesCard           from './charts/TotalEmployeesCard.vue'
import GenderBreakdownChart         from './charts/GenderBreakdown.vue'
import MonthlyJoinChart             from './charts/MonthlyJoinChart.vue'
// new chart
import DepartmentPositionStatusChart from './charts/DepartmentPositionStatusChart.vue'

const summary     = ref({ total: 0, trend: [] })
const genderData  = ref([])
const monthlyData = ref({ labels: [], counts: [] })

// for the new chart
const statusOptions  = ['Working', 'Resign', 'Terminate', 'Abandon', 'Pass Away', 'Retirement', '']
const initialStatus  = 'Working'

async function fetchDeptPosData(status) {
  const company = localStorage.getItem('company')
  const res = await axios.get(
    '/hrss/dashboard/employees/department-position-status',
    { params: { company, status } }
  )
  return Array.isArray(res.data) ? res.data : []
}

onMounted(async () => {
  const company = localStorage.getItem('company')
  if (!company) {
    console.warn('❌ Company not found in localStorage')
    return
  }

  // 🔢 Total Employees + Trend
  try {
    const res = await axios.get('/hrss/dashboard/employees', { params: { company } })
    summary.value = {
      total: res.data.total || 0,
      trend: Array.isArray(res.data.trend) && res.data.trend.length
        ? res.data.trend
        : [3200, 3400, 3600, 3900, 4100, 4300]
    }
  } catch (err) {
    console.error('❌ Failed to fetch total employees:', err.message)
  }

  // 👥 Gender Breakdown
  try {
    const res = await axios.get('/hrss/dashboard/employees/gender', { params: { company } })
    genderData.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('❌ Failed to fetch gender breakdown:', err.message)
  }

  // 📈 Monthly Join Chart
  try {
    const res = await axios.get('/hrss/dashboard/employees/monthly', { params: { company } })
    const raw = Array.isArray(res.data) ? res.data : []
    monthlyData.value = {
      labels: raw.map(r => r._id),
      counts: raw.map(r => r.count || 0)
    }
  } catch (err) {
    console.error('❌ Failed to fetch monthly joins:', err.message)
  }
})
</script>
