<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      Direct Labor In & Out Summary ({{ year }})
    </h3>

    <v-progress-linear
      v-if="isLoading"
      height="2"
      indeterminate
      class="mb-2"
    />

    <VueApexCharts
      v-if="series.length"
      type="bar"
      height="400"
      :options="chartOptions"
      :series="series"
    />
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

// ✅ Receive global year from parent (ExcomeDashboard.vue)
const { year } = defineProps({
  year: { type: Number, required: true }
})

const isLoading = ref(false)
const series = ref([])
const chartOptions = ref({})

async function fetchData() {
  try {
    isLoading.value = true
    const res = await axios.get('/hrss/excome/direct-labor-in-out', {
      params: { year }
    })
    const data = res.data?.data ?? []

    series.value = [
      { name: 'Joined',    data: data.map(d => d.joined ?? 0) },
      { name: 'Resigned',  data: data.map(d => d.resigned ?? 0) },
      { name: 'Balance',data: data.map(d => d.net ?? 0) }
    ]

    chartOptions.value = {
      chart: { type: 'bar', stacked: false, toolbar: { show: false } },
      xaxis: {
        categories: data.map(d => d.month),
        title: { text: 'Month' }
      },
      yaxis: {
        title: { text: 'Employee Count' },
        min: 0,
        forceNiceScale: true
      },
      tooltip: { shared: true, intersect: false },
      legend: { position: 'top' },
      plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
      colors: ['#2E7D32', '#C62828', '#1565C0']
    }
  } catch (err) {
    console.error('Failed to fetch direct labor in/out data:', err)
    series.value = []
    chartOptions.value = {}
  } finally {
    isLoading.value = false
  }
}

// 🔁 Load now and whenever the global year changes
watch(() => year, fetchData, { immediate: true })
</script>

<style scoped>
</style>
