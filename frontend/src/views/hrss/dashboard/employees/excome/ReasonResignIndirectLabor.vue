<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      📉 Indirect Labor Resign Reason Summary ({{ year }})
    </h3>

    <!-- Chart -->
    <VueApexCharts
      v-if="chartSeries.length"
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />

    <!-- Spacer -->
    <div class="my-6" />

    <!-- Table -->
    <v-table fixed-header class="table-scroll-x elevation-1">
      <thead>
        <tr>
          <th>Reason</th>
          <th v-for="month in months" :key="month">{{ month }}</th>
          <th>Total</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in summary" :key="row.reason">
          <td>{{ row.reason }}</td>
          <td
            v-for="month in months"
            :key="month"
          >
            <v-tooltip location="top">
              <template #activator="{ props }">
                <span v-bind="props">
                  {{ getMonthlyPercent(row[month], month) }}
                </span>
              </template>
              <span>{{ row[month] || 0 }} resignation(s)</span>
            </v-tooltip>
          </td>
          <td>{{ row.total }}</td>
          <td>{{ row.percent }}</td>
        </tr>
        <tr v-if="summary.length === 0">
          <td colspan="15" class="text-center text-grey">No resign data found for {{ year }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  year: {
    type: Number,
    required: true
  }
})

const summary = ref([])
const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const chartSeries = ref([])
const chartOptions = ref({})

// Compute monthly totals
const monthlyTotals = computed(() => {
  const totals = {}
  for (const month of months) {
    totals[month] = summary.value.reduce((sum, row) => sum + (row[month] || 0), 0)
  }
  return totals
})

// Percentage per cell
function getMonthlyPercent(count, month) {
  const total = monthlyTotals.value[month]
  if (!total || !count) return '0%'
  const pct = Math.round((count / total) * 100)
  return `${pct}%`
}

// Fetch API data
const fetchData = async () => {
  try {
    const res = await axios.get(`/hrss/excome/resign-reason-indirect-labor?year=${props.year}`)

    if (typeof res.data === 'string' && res.data.startsWith('<!DOCTYPE')) {
      console.warn('⚠️ Backend returned HTML instead of JSON — check route')
      return
    }

    summary.value = res.data?.table || []

    const sorted = [...summary.value].sort((a, b) => b.total - a.total).slice(0, 10)
    const labels = sorted.map(row => row.reason)
    const values = sorted.map(row => parseFloat(row.percent))

    chartSeries.value = [
      {
        name: 'Resign %',
        data: values
      }
    ]

    chartOptions.value = {
      chart: {
        type: 'bar',
        height: 350
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '50%',
          borderRadius: 4
        }
      },
      dataLabels: {
        enabled: true,
        formatter: val => `${val}%`
      },
      xaxis: {
        categories: labels,
        labels: {
          rotate: -45,
          style: { fontSize: '12px' }
        }
      },
      title: {
        text: 'Top Indirect Labor Resign Reasons (%)',
        align: 'center',
        style: { fontSize: '18px' }
      },
      yaxis: {
        labels: {
          formatter: val => `${val}%`
        },
        max: 100
      }
    }
  } catch (err) {
    console.error('❌ Failed to fetch indirect resign summary:', err)
  }
}

onMounted(fetchData)
watch(() => props.year, fetchData)
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
}
th, td {
  white-space: nowrap;
  text-align: center;
}
td:first-child {
  text-align: left;
}
</style>
