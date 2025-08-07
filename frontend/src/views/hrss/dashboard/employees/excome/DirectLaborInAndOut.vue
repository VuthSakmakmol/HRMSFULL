<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      👷‍♂️ Direct Labor In & Out Summary ({{ selectedYear }})
    </h3>

    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          variant="outlined"
          density="comfortable"
          @update:modelValue="fetchData"
        />
      </v-col>
    </v-row>

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
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'
import dayjs from 'dayjs'

const selectedYear = ref(new Date().getFullYear())
const yearOptions = ref([])
const series = ref([])
const chartOptions = ref({})

onMounted(() => {
  const currentYear = new Date().getFullYear()
  yearOptions.value = Array.from({ length: 5 }, (_, i) => currentYear - i)
  fetchData()
})

const fetchData = async () => {
  try {
    const res = await axios.get(`/hrss/excome/direct-labor-in-out?year=${selectedYear.value}`)
    const data = res.data.data

    series.value = [
      {
        name: 'Joined',
        data: data.map(d => d.joined)
      },
      {
        name: 'Resigned',
        data: data.map(d => d.resigned)
      },
      {
        name: 'Net Change',
        data: data.map(d => d.net)
      }
    ]

    chartOptions.value = {
      chart: {
        type: 'bar',
        stacked: false
      },
      xaxis: {
        categories: data.map(d => d.month),
        title: { text: 'Month' }
      },
      yaxis: {
        title: { text: 'Employee Count' },
        min: 0,
        forceNiceScale: true
      },
      tooltip: {
        shared: true,
        intersect: false
      },
      legend: {
        position: 'top'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch direct labor in/out data:', err)
  }
}
</script>
