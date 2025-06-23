<template>
  <v-card class="pa-4">
    <h4 class="text-subtitle-1 font-weight-bold mb-2">
      👥 Gender Breakdown
    </h4>
    <Doughnut v-if="chartData" :data="chartData" />
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

ChartJS.register(Tooltip, Legend, ArcElement)

const chartData = ref(null)

onMounted(async () => {
  try {
    const res = await axios.get('/hrss/employees')
    const employees = Array.isArray(res.data)
      ? res.data
      : res.data.employees || []

    const male = employees.filter(e => e.gender === 'Male').length
    const female = employees.filter(e => e.gender === 'Female').length
    const other = employees.filter(e => e.gender !== 'Male' && e.gender !== 'Female').length

    chartData.value = {
      labels: ['Male', 'Female', 'Other'],
      datasets: [
        {
          data: [male, female, other],
          backgroundColor: ['#42A5F5', '#EC407A', '#FFCA28'],
        }
      ]
    }
  } catch (err) {
    console.error('❌ Gender chart error:', err.message)
  }
})

</script>
