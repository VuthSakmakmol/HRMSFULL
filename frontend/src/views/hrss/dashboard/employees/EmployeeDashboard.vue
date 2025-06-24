<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">📊 ManPower</h2>

    <v-row dense>
      <!-- 🔢 Total Employees -->
      <v-col cols="12" sm="4">
        <TotalEmployeesCard :total="summary.total" :trend="summary.trend" />
      </v-col>

      <!-- 👥 Gender Breakdown -->
      <v-col cols="12" sm="4">
        <GenderBreakdownChart :data="genderData" />
      </v-col>

      <!-- 📈 Monthly Joins -->
      <v-col cols="12" sm="4">
        <MonthlyJoinChart :chartData="monthlyData" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import GenderBreakdownChart from './charts/GenderBreakdown.vue'
import MonthlyJoinChart from './charts/MonthlyJoinChart.vue'
import TotalEmployeesCard from './charts/TotalEmployeesCard.vue'

const genderData = ref([])
const monthlyData = ref({ labels: [], counts: [] })
const summary = ref({ total: 0, trend: [] })

onMounted(async () => {
  const company = localStorage.getItem('company')
  if (!company) {
    console.warn('❌ Company not found in localStorage')
    return
  }

  // 🔢 Total Employees + Trend
  try {
    console.log('📡 Fetching employee summary for company:', company)
    const res = await axios.get('/hrss/dashboard/employees', {
      params: { company }
    })
    console.log('✅ Total employee summary:', res.data)
    summary.value = {
      total: res.data.total || 0,
      trend: Array.isArray(res.data.trend) && res.data.trend.length
        ? res.data.trend
        : [3200, 3400, 3600, 3900, 4100, 4300] // fallback for now
    }
  } catch (err) {
    console.error('❌ Failed to fetch total employees:', err.message)
  }

  // 👥 Gender Breakdown
  try {
    console.log('📡 Fetching gender breakdown for company:', company)
    const res = await axios.get('/hrss/dashboard/employees/gender', {
      params: { company }
    })
    console.log('✅ Gender data:', res.data)
    genderData.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('❌ Failed to fetch gender breakdown:', err.message)
  }

  // 📈 Monthly Join Chart
  try {
    console.log('📡 Fetching monthly joins for company:', company)
    const res = await axios.get('/hrss/dashboard/employees/monthly', {
      params: { company }
    })
    const rawData = Array.isArray(res.data) ? res.data : []
    const labels = rawData.map(row => row._id)
    const counts = rawData.map(row => row.count || 0)
    monthlyData.value = { labels, counts }
    console.log('✅ Monthly Chart Data:', monthlyData.value)
  } catch (err) {
    console.error('❌ Failed to fetch monthly joins:', err.message)
  }
})
</script>
