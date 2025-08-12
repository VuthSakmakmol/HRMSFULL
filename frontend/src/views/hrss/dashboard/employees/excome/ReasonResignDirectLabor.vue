<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      Monthly Resign Reason Summary ({{ year }})
    </h3>

    <v-row class="mb-4" dense>
      <v-col cols="12" sm="4">
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          item-title="label"
          item-value="value"
          label="Filter by Month"
          variant="outlined"
          density="comfortable"
          clearable
        />
      </v-col>
    </v-row>

    <VueApexCharts
      type="bar"
      height="420"
      :options="chartOptions"
      :series="chartSeries"
    />
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({ year: Number })

const chartSeries = ref([])
const chartOptions = ref({})
const summaryTable = ref([])

const selectedMonth = ref('') // '' means "All Months"

const monthOptions = [
  { label: 'All Months', value: '' },
  { label: 'January', value: 'Jan' },
  { label: 'February', value: 'Feb' },
  { label: 'March', value: 'Mar' },
  { label: 'April', value: 'Apr' },
  { label: 'May', value: 'May' },
  { label: 'June', value: 'Jun' },
  { label: 'July', value: 'Jul' },
  { label: 'August', value: 'Aug' },
  { label: 'September', value: 'Sep' },
  { label: 'October', value: 'Oct' },
  { label: 'November', value: 'Nov' },
  { label: 'December', value: 'Dec' }
]

const fetchData = async () => {
  try {
    const res = await axios.get('/hrss/excome/resign-reason-summary', {
      params: { year: props.year }
    })
    summaryTable.value = res.data?.table || []
    updateChart()
  } catch (err) {
    console.error('❌ Failed to fetch monthly resign data:', err)
  }
}

// Updates chart based on selectedMonth
const updateChart = () => {
  if (!selectedMonth.value) {
    // All Months → Stacked chart
    chartSeries.value = summaryTable.value.map(row => ({
      name: row.reason,
      data: monthOptions
        .filter(m => m.value) // skip 'All Months'
        .map(m => row[m.value] || 0)
    }))

    chartOptions.value = {
      chart: { type: 'bar', stacked: true, toolbar: { show: true } },
      xaxis: {
        categories: monthOptions.filter(m => m.value).map(m => m.label),
        title: { text: 'Month' },
        labels: { style: { fontSize: '12px' } }
      },
      yaxis: {
        title: { text: 'Resignation Count' },
        labels: { style: { fontSize: '12px' } }
      },
      tooltip: {
        y: { formatter: val => `${val} resignation(s)` }
      },
      legend: {
        position: 'bottom',
        fontSize: '13px'
      },
      plotOptions: {
        bar: { horizontal: false }
      },
      dataLabels: { enabled: false },
      title: {
        text: 'Resignation Reason Breakdown by Month',
        align: 'center',
        style: { fontSize: '16px' }
      }
    }
  } else {
    // Single month → Horizontal bar by reason
    const labels = summaryTable.value.map(row => row.reason)
    const values = summaryTable.value.map(row => row[selectedMonth.value] || 0)

    chartSeries.value = [{ name: 'Resignations', data: values }]

    chartOptions.value = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 6 }
      },
      xaxis: {
        categories: labels,
        labels: { style: { fontSize: '12px' } }
      },
      yaxis: {
        labels: {
          style: { fontSize: '13px' },
          formatter: label => label.length > 30 ? label.slice(0, 28) + '…' : label
        }
      },
      dataLabels: {
        enabled: true,
        formatter: val => `${val}`,
        style: { fontWeight: 600 }
      },
      colors: ['#3b82f6'],
      tooltip: {
        y: { formatter: val => `${val} resignation(s)` }
      },
      title: {
        text: `Resignation Reasons in ${monthOptions.find(m => m.value === selectedMonth.value)?.label}`,
        align: 'center',
        style: { fontSize: '16px' }
      }
    }
  }
}

onMounted(fetchData)
watch([() => props.year, selectedMonth], fetchData)
</script>
