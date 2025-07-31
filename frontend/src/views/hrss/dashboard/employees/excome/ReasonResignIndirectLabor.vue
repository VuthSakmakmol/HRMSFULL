<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-2">
      📊 Indirect Labor Resign Reasons ({{ year }})
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
import { ref, onMounted, watch } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({ year: Number })

const summary = ref([])
const chartSeries = ref([])
const chartOptions = ref({})

const selectedMonth = ref('')
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
    const res = await axios.get(`/hrss/excome/resign-reason-indirect-labor`, {
      params: { year: props.year }
    })
    summary.value = res.data?.table || []
    updateChart()
  } catch (err) {
    console.error('❌ Failed to load chart data:', err)
  }
}

const updateChart = () => {
  if (!selectedMonth.value) {
    // All Months View — Percent Horizontal Bar
    const top10 = [...summary.value].sort((a, b) => b.total - a.total).slice(0, 10)
    const labels = top10.map(r => r.reason)
    const values = top10.map(r => parseFloat(r.percent))

    chartSeries.value = [
      {
        name: 'Resign %',
        data: values
      }
    ]

    chartOptions.value = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 6
        }
      },
      dataLabels: {
        enabled: true,
        formatter: val => `${val}%`,
        style: {
          fontSize: '13px',
          fontWeight: 600
        }
      },
      xaxis: {
        categories: labels,
        labels: {
          style: { fontSize: '13px' }
        },
        max: 100
      },
      yaxis: {
        labels: {
          style: { fontSize: '13px' },
          formatter: label => label.length > 28 ? label.slice(0, 26) + '…' : label
        }
      },
      colors: ['#3b82f6'],
      tooltip: {
        y: { formatter: val => `${val}%` }
      },
      title: {
        text: 'Indirect Labor Resign Reasons (%) — Horizontal View',
        align: 'center',
        style: { fontSize: '16px' }
      }
    }
  } else {
    // Single Month View — Horizontal Count by Reason
    const filtered = summary.value.map(r => ({
      reason: r.reason,
      count: r[selectedMonth.value] || 0
    })).filter(r => r.count > 0)

    const labels = filtered.map(r => r.reason)
    const values = filtered.map(r => r.count)

    chartSeries.value = [
      {
        name: 'Resignations',
        data: values
      }
    ]

    chartOptions.value = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 6
        }
      },
      dataLabels: {
        enabled: true,
        formatter: val => `${val}`,
        style: {
          fontSize: '13px',
          fontWeight: 600
        }
      },
      xaxis: {
        categories: labels,
        labels: { style: { fontSize: '13px' } }
      },
      yaxis: {
        labels: {
          style: { fontSize: '13px' },
          formatter: label => label.length > 28 ? label.slice(0, 26) + '…' : label
        }
      },
      colors: ['#f97316'],
      tooltip: {
        y: { formatter: val => `${val} resignation(s)` }
      },
      title: {
        text: `Indirect Resign Reasons in ${monthOptions.find(m => m.value === selectedMonth.value)?.label}`,
        align: 'center',
        style: { fontSize: '16px' }
      }
    }
  }
}

onMounted(fetchData)
watch([() => props.year, selectedMonth], fetchData)
</script>
