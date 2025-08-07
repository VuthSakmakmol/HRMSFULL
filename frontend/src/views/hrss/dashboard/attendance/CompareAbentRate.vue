<template>
  <v-card class="pa-4 rounded-xl elevation-1">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-2">
      <div>
        <h3 class="text-h6 font-weight-bold">
          📊 Direct Labor Absent Rate ({{ selectedYear - 1 }} vs {{ selectedYear }})
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
      <v-btn color="primary" @click="openDialog">
        🎯 Target: <strong>{{ target }}%</strong>
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

    <!-- Fallback -->
    <v-alert v-else type="error" class="mt-4">
      No absent data available for this period.
    </v-alert>

    <!-- Monthly absent count table -->
    <v-table v-if="rawData.length" class="mt-6">
      <thead>
        <tr>
          <th>Year</th>
          <th v-for="row in rawData" :key="row.month">{{ row.month }}</th>
          <th class="text-primary">Avg</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ selectedYear - 1 }} Absent</td>
          <td v-for="row in rawData" :key="'last-' + row.month">
            {{ row.lastYearAbsentCount }}
          </td>
          <td class="text-primary font-weight-medium">
            {{
              (
                rawData.reduce((sum, row) => sum + row.lastYearAbsentCount, 0) / rawData.length
              ).toFixed(1)
            }}
          </td>
        </tr>
        <tr>
          <td>{{ selectedYear }} Absent</td>
          <td v-for="row in rawData" :key="'this-' + row.month">
            {{ row.thisYearAbsentCount }}
          </td>
          <td class="text-primary font-weight-medium">
            {{
              (
                rawData.reduce((sum, row) => sum + row.thisYearAbsentCount, 0) / rawData.length
              ).toFixed(1)
            }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Target Dialog -->
    <v-dialog v-model="dialog" width="400">
      <v-card>
        <v-card-title class="text-h6">Update Absent Rate Target</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newTarget"
            label="Target (%)"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="updateTargetValue">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import VueApexCharts from 'vue3-apexcharts'

const selectedYear = ref(new Date().getFullYear())
const yearOptions = Array.from({ length: 6 }, (_, i) => 2020 + i)

const target = ref(0)
const newTarget = ref(0)
const dialog = ref(false)

const chartSeries = ref([])
const chartOptions = ref({})
const rawData = ref([])

const openDialog = () => {
  newTarget.value = target.value
  dialog.value = true
}

const updateTargetValue = async () => {
  try {
    await axios.post('/hrss/attendance-dashboard/attendance/update-target', {
      year: selectedYear.value,
      type: 'AbsentRate',
      value: newTarget.value
    })

    target.value = newTarget.value
    dialog.value = false

    Swal.fire({
      icon: 'success',
      text: '🎯 Target updated!',
      timer: 1500,
      showConfirmButton: false
    })

    fetchData()
  } catch (err) {
    Swal.fire({ icon: 'error', text: 'Failed to update target' })
  }
}

const fetchData = async () => {
  try {
    const res = await axios.get('/hrss/attendance-dashboard/attendance/direct-absent-rate-compare', {
      params: { year: selectedYear.value }
    })

    const { data, target: fetchedTarget } = res.data || {}
    if (!Array.isArray(data)) {
      chartSeries.value = []
      rawData.value = []
      return
    }

    rawData.value = data
    target.value = fetchedTarget ?? 0

    const months = data.map(m => m.month)
    const lastYearRates = data.map(m => m.lastYearAbsentRate)
    const thisYearRates = data.map(m => m.thisYearAbsentRate)

    const avgLastYearRate = lastYearRates.reduce((a, b) => a + b, 0) / lastYearRates.length
    const avgThisYearRate = thisYearRates.reduce((a, b) => a + b, 0) / thisYearRates.length

    chartSeries.value = [
      {
        name: `${selectedYear.value - 1}`,
        data: [...lastYearRates, avgLastYearRate]
      },
      {
        name: `${selectedYear.value}`,
        data: [...thisYearRates, avgThisYearRate]
      }
    ]

    chartOptions.value = {
      chart: {
        stacked: false,
        toolbar: { show: false }
      },
      xaxis: {
        categories: [...months, 'Avg'],
        labels: { style: { fontSize: '13px' } }
      },
      yaxis: {
        min: 0,
        max: 100,
        labels: {
          formatter: val => `${val.toFixed(1)}%`
        },
        title: { text: 'Absent Rate (%)' }
      },
      dataLabels: {
        enabled: true,
        formatter: val => `${val.toFixed(1)}%`,
        style: {
          colors: ['#000000']
        }
      },
      colors: ['#9E9E9E', '#2196F3'],
      annotations: {
        yaxis: [
          {
            y: target.value,
            strokeDashArray: 4,
            borderColor: 'red',
            label: {
              borderColor: 'red',
              style: { color: '#fff', background: 'red' },
              text: `🎯 Target: ${target.value}%`
            }
          }
        ]
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val, { seriesIndex, dataPointIndex }) => {
            const row = rawData.value[dataPointIndex]
            if (!row) return `${val.toFixed(1)}%`
            const absents = seriesIndex === 0
              ? row.lastYearAbsentCount
              : row.thisYearAbsentCount
            return `${val.toFixed(1)}% (${absents} absents)`
          }
        }
      },
      legend: { position: 'top' }
    }
  } catch (err) {
    console.error('❌ Error fetching data:', err)
    chartSeries.value = []
    rawData.value = []
  }
}

onMounted(fetchData)
watch(selectedYear, fetchData)
</script>
