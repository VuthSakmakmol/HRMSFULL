<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-2">
      📊 Indirect Labor Resign Reasons ({{ year }})
    </h3>

    <VueApexCharts
      type="bar"
      height="400"
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

const fetchData = async () => {
  try {
    const res = await axios.get(`/hrss/excome/resign-reason-indirect-labor?year=${props.year}`)
    summary.value = res.data?.table || []

    // Sort by total and take top 10
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
      chart: {
        type: 'bar',
        toolbar: { show: false }
      },
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
        y: {
          formatter: val => `${val}%`
        }
      },
      title: {
        text: 'Indirect Labor Resign Reasons (%) — Horizontal View',
        align: 'center',
        style: { fontSize: '16px' }
      }
    }
  } catch (err) {
    console.error('❌ Failed to load chart data:', err)
  }
}

onMounted(fetchData)
watch(() => props.year, fetchData)
</script>
