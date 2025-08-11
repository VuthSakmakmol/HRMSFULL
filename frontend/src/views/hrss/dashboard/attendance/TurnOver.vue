<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <!-- Header + Year + Target -->
    <div class="d-flex justify-space-between align-center mb-2">
      <div>
        <h3 class="text-h6 font-weight-bold">
          🧾 Direct Labor Turnover Rate ({{ selectedYear }})
        </h3>
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mt-2"
          style="max-width: 150px"
        />
      </div>

      <v-btn color="primary" @click="openTargetDialog">
        🎯 Target: <strong>{{ currentTarget }}%</strong>
      </v-btn>
    </div>

    <!-- Chart -->
    <VueApexCharts
      v-if="chartSeries.length"
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />
    <v-alert v-else type="info" class="mt-4">
      No turnover data available for this period.
    </v-alert>

    <!-- Transposed Summary Table -->
    <v-table v-if="summary.length" class="mt-6 table-scroll-x">
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
          <td v-for="item in summary" :key="'ty-joined-' + item.month">{{ item.thisYearJoined }}</td>
        </tr>
        <tr>
          <td>This Year Left</td>
          <td v-for="item in summary" :key="'ty-left-' + item.month">{{ item.thisYearExits }}</td>
        </tr>
        <tr>
          <td>This Year Turnover (%)</td>
          <td v-for="item in summary" :key="'ty-rate-' + item.month">{{ item.thisYearRate }}%</td>
        </tr>
        <tr>
          <td>Last Year Joined</td>
          <td v-for="item in summary" :key="'ly-joined-' + item.month">{{ item.lastYearJoined }}</td>
        </tr>
        <tr>
          <td>Last Year Left</td>
          <td v-for="item in summary" :key="'ly-left-' + item.month">{{ item.lastYearExits }}</td>
        </tr>
        <tr>
          <td>Last Year Turnover (%)</td>
          <td v-for="item in summary" :key="'ly-rate-' + item.month">{{ item.lastYearRate }}%</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Target Dialog -->
    <v-dialog v-model="showTargetDialog" width="400">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">Update Turnover Target (%)</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newTarget"
            label="Target %"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" @click="showTargetDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="updateTarget">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import VueApexCharts from 'vue3-apexcharts'

const selectedYear = ref(new Date().getFullYear())
const yearOptions = Array.from({ length: 5 }, (_, i) => selectedYear.value - i)

const summary = ref([])
const chartSeries = ref([])
const chartOptions = ref({})
const currentTarget = ref(0)
const newTarget = ref(0)
const showTargetDialog = ref(false)

const openTargetDialog = () => {
  newTarget.value = currentTarget.value
  showTargetDialog.value = true
}

const buildChart = () => {
  const months = summary.value.map(m => m.month)
  const thisYearRates = summary.value.map(m => m.thisYearRate)
  const lastYearRates = summary.value.map(m => m.lastYearRate)

  chartSeries.value = [
    { name: 'This Year (%)', type: 'column', data: thisYearRates },
    { name: 'Last Year (%)', type: 'column', data: lastYearRates },
    { name: 'Target (%)', type: 'line', data: Array(12).fill(currentTarget.value) }
  ]

  chartOptions.value = {
    chart: { type: 'line', stacked: false, toolbar: { show: false } },
    xaxis: { categories: months },
    yaxis: {
      title: { text: 'Turnover %' },
      labels: { formatter: v => `${Number(v).toFixed(1)}%` }
    },
    stroke: { width: [2, 2, 2], dashArray: [0, 0, 6] },
    colors: ['#1E88E5', '#43A047', '#e53935'],
    legend: { position: 'top' },
    dataLabels: { enabled: false },
    annotations: {
      yaxis: [
        {
          y: currentTarget.value,
          strokeDashArray: 4,
          borderColor: 'red',
          label: {
            borderColor: 'red',
            style: { color: '#fff', background: 'red' },
            text: `🎯 Target: ${currentTarget.value}%`
          }
        }
      ]
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: v => `${Number(v).toFixed(1)}%` }
    }
  }
}

const fetchData = async () => {
  try {
    const { data } = await axios.get(
      `/hrss/attendance-dashboard/turnover/direct-labor?year=${selectedYear.value}`
    )
    summary.value = data?.data ?? []
    currentTarget.value = data?.target ?? 0
    buildChart()
  } catch (err) {
    console.error('❌ Failed to fetch turnover data:', err)
    summary.value = []
    chartSeries.value = []
  }
}

const updateTarget = async () => {
  try {
    await axios.put('/hrss/attendance-dashboard/turnover/target', {
      year: selectedYear.value,
      type: 'TurnoverRate',
      value: parseFloat(newTarget.value)
    })
    currentTarget.value = parseFloat(newTarget.value) || 0
    showTargetDialog.value = false

    Swal.fire({
      icon: 'success',
      text: '🎯 Target updated!',
      timer: 1500,
      showConfirmButton: false
    })

    await fetchData() // refresh data + rebuild chart with new target
  } catch (err) {
    console.error('❌ Failed to update target:', err)
    Swal.fire({ icon: 'error', text: 'Failed to update target' })
  }
}

onMounted(fetchData)
watch(selectedYear, fetchData)
</script>
