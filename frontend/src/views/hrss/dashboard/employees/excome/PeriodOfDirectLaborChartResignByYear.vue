<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      Period of Direct Labor Resignation by Service Duration ({{ year }})
    </h3>

    <v-progress-linear
      v-if="isLoading"
      height="2"
      indeterminate
      class="mb-2"
    />

    <VueApexCharts
      v-if="chartSeries.length"
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

// ✅ receive global year from parent
const { year } = defineProps({
  year: { type: Number, required: true }
})

const isLoading = ref(false)
const chartSeries = ref([])
const chartOptions = ref({})

async function fetchChartData() {
  try {
    isLoading.value = true

    const res = await axios.get('/hrss/excome/period-of-direct-chart-resign', {
      params: { year }
    })

    const chartData = res.data?.data || []

    const percents = chartData.map(item => {
      const num = parseFloat(item.percent)
      return Number.isFinite(num) ? num : 0
    })

    chartSeries.value = [
      { name: 'Percentage', data: percents }
    ]

    chartOptions.value = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: {
        bar: { horizontal: false, columnWidth: '45%', distributed: true }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${Number(val).toFixed(2)}%`,
        offsetY: -10,
        style: { fontSize: '12px', colors: ['#000'] }
      },
      xaxis: {
        categories: chartData.map(item => item.group),
        labels: { rotate: -10 }
      },
      yaxis: {
        title: { text: 'Percentage (%)' },
        labels: { formatter: (val) => `${Number(val).toFixed(0)}%` },
        min: 0,
        max: Math.max(100, Math.ceil(Math.max(...percents, 0) / 10) * 10)
      },
      tooltip: { y: { formatter: (val) => `${Number(val).toFixed(2)}%` } },
      colors: ['#1E88E5']
    }
  } catch (err) {
    console.error('❌ Failed to fetch direct chart data:', err)
    chartSeries.value = []
    chartOptions.value = {}
  } finally {
    isLoading.value = false
  }
}

// 🔁 load now and whenever global year changes
watch(() => year, fetchChartData, { immediate: true })
</script>

<style scoped>
</style>
