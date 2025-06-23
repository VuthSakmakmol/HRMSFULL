<template>
  <v-card class="pa-4" height="360">
    <h4 class="text-subtitle-1 font-weight-bold mb-2">
      📉 Monthly Employee Joins
    </h4>
    <Line v-if="chartData" :data="chartData" :options="options" class="chart-height" />
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from 'chart.js'

// Register chart components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
)

// Chart options
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        stepSize: 1,
      },
    }
  }
}

const chartData = ref(null)

onMounted(async () => {
  try {
    const currentYear = new Date().getFullYear()

    // 📡 Fetch data from your real backend
    const res = await axios.get('/api/hrss/employees')

    // ✅ Safe extract employees
    const employees = Array.isArray(res.data)
      ? res.data
      : res.data.employees || []

    // 🧠 Filter only employees joined this year
    const thisYearEmployees = employees.filter(emp => {
      const date = new Date(emp.createdAt)
      return date.getFullYear() === currentYear
    })

    // 📊 Count monthly joins
    const monthlyCounts = Array(12).fill(0)
    for (const emp of thisYearEmployees) {
      const date = new Date(emp.createdAt)
      const month = date.getMonth()
      monthlyCounts[month]++
    }

    // 📈 Prepare chart data
    chartData.value = {
      labels: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ],
      datasets: [
        {
          label: `Employees Joined in ${currentYear}`,
          data: monthlyCounts,
          borderColor: '#4CAF50',
          backgroundColor: '#C8E6C9',
          tension: 0.3,
          fill: true,
        }
      ]
    }
  } catch (err) {
    console.error('❌ Failed to fetch monthly data:', err.message)
  }
})
</script>

<style scoped>
.chart-height {
  height: 260px;
}
</style>
