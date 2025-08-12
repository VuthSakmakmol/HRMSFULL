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
        🎯 Target: <strong>{{ currentTarget ?? 0 }}%</strong>
      </v-btn>
    </div>

    <!-- Thin progress while fetching -->
    <v-progress-linear
      v-if="isFetching"
      indeterminate
      height="3"
      class="mb-2"
    />

    <!-- Chart stays mounted; no flashing -->
    <VueApexCharts
      v-show="hasSeries"
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />
    <v-alert v-if="!hasSeries && !isFetching" type="info" class="mt-4">
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
import { ref, onMounted, watch, computed } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import VueApexCharts from 'vue3-apexcharts'

const selectedYear = ref(new Date().getFullYear())
const yearOptions = Array.from({ length: 5 }, (_, i) => selectedYear.value - i)

const summary = ref([])
const currentTarget = ref(null)
const newTarget = ref(0)
const showTargetDialog = ref(false)
const isFetching = ref(false)

const hasSeries = computed(() => summary.value.length > 0)

const openTargetDialog = () => {
  newTarget.value = Number(currentTarget.value ?? 0)
  showTargetDialog.value = true
}

/* ---------- SINGLE SOURCE OF TRUTH: summary + currentTarget ---------- */
const months = computed(() => summary.value.map(m => m.month))

const chartSeries = computed(() => {
  if (!summary.value.length) return []
  const thisYearRates = summary.value.map(m => Number(m.thisYearRate ?? 0))
  const lastYearRates = summary.value.map(m => Number(m.lastYearRate ?? 0))
  const targetLine = summary.value.map(() => Number(currentTarget.value ?? 0))

  return [
    { name: 'This Year (%)', type: 'column', data: thisYearRates },
    { name: 'Last Year (%)', type: 'column', data: lastYearRates },
    { name: 'Target (%)', type: 'line', data: targetLine }
  ]
})

const chartOptions = computed(() => {
  return {
    chart: { type: 'line', stacked: false, toolbar: { show: false } },
    xaxis: { categories: months.value },
    yaxis: {
      title: { text: 'Turnover %' },
      labels: { formatter: v => `${Number(v).toFixed(1)}%` }
    },
    stroke: { width: [2, 2, 2], dashArray: [0, 0, 6] },
    colors: ['#1E88E5', '#43A047', '#e53935'],
    legend: { position: 'top' },
    dataLabels: { enabled: false },
    annotations: (!isFetching.value && currentTarget.value != null)
      ? {
          yaxis: [{
            y: Number(currentTarget.value),
            strokeDashArray: 4,
            borderColor: 'red',
            label: {
              borderColor: 'red',
              style: { color: '#fff', background: 'red' },
              text: `🎯 Target: ${Number(currentTarget.value)}%`
            }
          }]
        }
      : { yaxis: [] },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: v => `${Number(v).toFixed(1)}%` }
    }
  }
})

/* --------------------------- Data fetching --------------------------- */
const fetchData = async () => {
  isFetching.value = true
  try {
    const { data } = await axios.get(
      `/hrss/attendance-dashboard/turnover/direct-labor?year=${selectedYear.value}`
    )
    summary.value = Array.isArray(data?.data) ? data.data : []
    currentTarget.value = data?.target ?? 0
  } catch (err) {
    console.error('❌ Failed to fetch turnover data:', err)
  } finally {
    isFetching.value = false
  }
}

const updateTarget = async () => {
  try {
    await axios.put('/hrss/attendance-dashboard/turnover/target', {
      year: selectedYear.value,
      type: 'TurnoverRate',
      value: Number(newTarget.value)
    })
    currentTarget.value = Number(newTarget.value)
    showTargetDialog.value = false

    Swal.fire({
      icon: 'success',
      text: '🎯 Target updated!',
      timer: 1500,
      showConfirmButton: false
    })
    // No manual rebuild needed — computed chart updates automatically.
    fetchData() // optional fresh pull if backend adjusts anything else
  } catch (err) {
    console.error('❌ Failed to update target:', err)
    Swal.fire({ icon: 'error', text: 'Failed to update target' })
  }
}

onMounted(fetchData)
watch(selectedYear, fetchData)
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
  display: block;
  white-space: nowrap;
}
</style>
