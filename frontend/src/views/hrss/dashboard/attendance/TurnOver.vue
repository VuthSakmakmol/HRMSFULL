<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      🧾 Direct Labor Turnover Rate ({{ selectedYear }})
    </h3>

    <!-- Year Selector -->
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

    <!-- Bar Chart -->
    <VueApexCharts
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />

    <!-- Transposed Table: Months as columns -->
    <v-table class="mt-6 table-scroll-x">
    <thead>
        <tr>
        <th>Category</th>
        <th v-for="item in summary" :key="item.month">
            {{ item.month }}
        </th>
        </tr>
    </thead>
    <tbody>
        <tr>
        <td>This Year Joined</td>
        <td v-for="item in summary" :key="'joined-' + item.month">{{ item.thisYearJoined }}</td>
        </tr>
        <tr>
        <td>This Year Left</td>
        <td v-for="item in summary" :key="'exits-' + item.month">{{ item.thisYearExits }}</td>
        </tr>
        <tr>
        <td>This Year Turnover (%)</td>
        <td v-for="item in summary" :key="'rate-' + item.month">{{ item.thisYearRate }}%</td>
        </tr>
        <tr>
        <td>Last Year Joined</td>
        <td v-for="item in summary" :key="'ly-joined-' + item.month">{{ item.lastYearJoined }}</td>
        </tr>
        <tr>
        <td>Last Year Left</td>
        <td v-for="item in summary" :key="'ly-exits-' + item.month">{{ item.lastYearExits }}</td>
        </tr>
        <tr>
        <td>Last Year Turnover (%)</td>
        <td v-for="item in summary" :key="'ly-rate-' + item.month">{{ item.lastYearRate }}%</td>
        </tr>
    </tbody>
    </v-table>

  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'
import dayjs from 'dayjs'

// Chart & Data Refs
const summary = ref([])
const chartSeries = ref([])
const chartOptions = ref({})
const selectedYear = ref(new Date().getFullYear())

const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

// Fetch API
const fetchData = async () => {
  try {
    const res = await axios.get(
      `/hrss/attendance-dashboard/turnover/direct-labor?year=${selectedYear.value}`
    )
    const raw = res.data.data
    summary.value = raw

    chartSeries.value = [
        {
            name: 'This Year (%)',
            type: 'column',
            data: raw.map((m) => m.thisYearRate)
        },
        {
            name: 'Last Year (%)',
            type: 'column',
            data: raw.map((m) => m.lastYearRate)
        },
        {
            name: 'Target (%)',
            type: 'line',
            data: Array(12).fill(res.data.target)
        }
        ]

        chartOptions.value = {
        chart: {
            type: 'line',
            stacked: false
        },
        xaxis: {
            categories: raw.map((m) => m.month)
        },
        yaxis: {
            title: { text: 'Turnover %' }
        },
        stroke: {
            width: [2, 2, 2],
            dashArray: [0, 0, 6],
            colors: ['#1E88E5', '#43A047', '#e53935'] // blue, green, red
        },
        plotOptions: {
            bar: {
            columnWidth: '50%'
            }
        },
        colors: ['#1E88E5', '#43A047', '#e53935'], // same order as stroke
        legend: {
            position: 'top'
        },
        dataLabels: {
            enabled: false
        }
        }

  } catch (err) {
    console.error('❌ Failed to fetch turnover data:', err)
  }
}

// Init
onMounted(fetchData)
watch(selectedYear, fetchData)
</script>
