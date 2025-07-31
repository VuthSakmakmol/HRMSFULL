<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({ year: Number })

const chartSeries = ref([])
const chartOptions = ref({})
const summary = ref([])

const fetchData = async () => {
  try {
    const res = await axios.get(`/hrss/excome/resign-reason-summary?year=${props.year}`)
    summary.value = res.data?.table || []

    const labels = summary.value.map(r => r.reason)
    const values = summary.value.map(r => parseFloat(r.percent))

    chartSeries.value = [
      {
        name: 'Resign %',
        data: values
      }
    ]

    chartOptions.value = {
  chart: {
    type: 'bar',
    height: 450
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4
    }
  },
  dataLabels: {
    enabled: true,
    formatter: val => `${val}%`
  },
  xaxis: {
    categories: labels,
    labels: { style: { fontSize: '12px' } }
  },
  yaxis: {
    labels: { style: { fontSize: '12px' } }
  },
  title: {
    text: 'Direct Labor Resign Reasons (%) — Horizontal View',
    align: 'center'
  }
}

  } catch (err) {
    console.error('❌ Error fetching resign summary:', err)
  }
}

onMounted(fetchData)
watch(() => props.year, fetchData)
</script>

<template>
  <v-card class="pa-4 mb-6">
    <h3 class="text-h6 font-weight-bold mb-4">📊 Resign Reasons Chart ({{ year }})</h3>
    <VueApexCharts
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />
  </v-card>
</template>
