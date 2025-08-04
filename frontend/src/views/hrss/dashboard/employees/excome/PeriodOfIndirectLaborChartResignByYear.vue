<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      📊 Period of Indirect Labor Resignation by Service Duration ({{ selectedYear }})
    </h3>

    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          variant="outlined"
          density="comfortable"
        />
      </v-col>
    </v-row>

    <VueApexCharts
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

const chartSeries = ref([])
const chartOptions = ref({})

const fetchChartData = async () => {
  try {
    const res = await axios.get('/hrss/excome/period-of-indirect-chart-resign', {
      params: { year: selectedYear.value }
    })

    const chartData = res.data?.data || []

    chartSeries.value = [{
      name: 'Percentage',
      data: chartData.map(item => parseFloat(item.percent))
    }]

    chartOptions.value = {
      chart: {
        type: 'bar',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '45%',
          distributed: true
        }
      },
      dataLabels: {
        enabled: true,
        formatter: val => `${val.toFixed(2)}%`,
        offsetY: -10,
        style: {
          fontSize: '12px',
          colors: ['#000']
        }
      },
      xaxis: {
        categories: chartData.map(item => item.group),
        labels: { rotate: -10 }
      },
      yaxis: {
        title: { text: 'Percentage (%)' },
        labels: {
          formatter: val => `${val.toFixed(0)}%`
        }
      },
      tooltip: {
        y: {
          formatter: val => `${val.toFixed(2)}%`
        }
      },
      colors: ['#26A69A']
    }
  } catch (err) {
    console.error('❌ Failed to fetch indirect chart data:', err)
  }
}

onMounted(fetchChartData)
watch(selectedYear, fetchChartData)
</script>
