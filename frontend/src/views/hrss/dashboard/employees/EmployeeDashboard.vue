<template>
  <v-container fluid>
    <h2 class="text-h6 font-weight-bold mb-4">👥 Employee Dashboard</h2>

    <!-- KPIs -->
    <v-row dense class="mb-4">
      <v-col cols="12" sm="4">
        <v-card class="pa-4 text-center">
          <h3 class="text-subtitle-2 font-weight-bold">Total Employees</h3>
          <div class="text-h5 font-weight-bold">{{ totalEmployees }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="pa-4 text-center">
          <h3 class="text-subtitle-2 font-weight-bold">Male Employees</h3>
          <div class="text-h5 font-weight-bold">{{ maleCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="pa-4 text-center">
          <h3 class="text-subtitle-2 font-weight-bold">Female Employees</h3>
          <div class="text-h5 font-weight-bold">{{ femaleCount }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts -->
    <v-row dense>
      <v-col cols="12" md="6">
        <MonthlyJoinChart :data="monthlyJoinData" />
      </v-col>
      <v-col cols="12" md="6">
        <GenderBreakdown :male="maleCount" :female="femaleCount" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import MonthlyJoinChart from './charts/MonthlyJoinChart.vue'
import GenderBreakdown from './charts/GenderBreakdown.vue'

const totalEmployees = ref(0)
const maleCount = ref(0)
const femaleCount = ref(0)
const monthlyJoinData = ref([])

const fetchDashboardData = async () => {
  try {
    const res = await axios.get('/api/hrss/dashboard/employees')
    totalEmployees.value = res.data.total
    maleCount.value = res.data.male
    femaleCount.value = res.data.female
    monthlyJoinData.value = res.data.monthlyJoin || []
  } catch (err) {
    console.error('❌ Failed to fetch dashboard:', err)
  }
}

onMounted(fetchDashboardData)
</script>
