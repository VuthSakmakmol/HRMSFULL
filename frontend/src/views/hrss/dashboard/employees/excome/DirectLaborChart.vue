<template>
  <div>
    <strong>Direct Labor Headcount</strong>
    <apexchart
      v-if="seriesHeadcount.length"
      type="line"
      height="400"
      :options="optionsHeadcount"
      :series="seriesHeadcount"
    />

    <br />

    <strong>Fill Rate and Variance</strong>
    <apexchart
      v-if="seriesFillRate.length"
      type="line"
      height="400"
      :options="optionsFillRate"
      :series="seriesFillRate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import axios from '@/utils/axios'

// Props
const props = defineProps<{ year: number }>()

// Reactive state
const seriesHeadcount = ref<any[]>([])
const optionsHeadcount = ref<any>({})
const seriesFillRate = ref<any[]>([])
const optionsFillRate = ref<any>({})

// Helper
const formatMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
}

// Fetch and update chart data when year changes
watch(() => props.year, fetchChartData, { immediate: true })

async function fetchChartData() {
  try {
    const { data } = await axios.get('/hrss/excome/manpower/targets', {
      params: { year: props.year }
    })

    const direct = data.categories.find((c: any) => c.key === 'direct')
    const months = data.months.map(formatMonth)

    if (!direct) return

    const fillRate = direct.targetBudget.map((b: number, i: number) =>
      b > 0 ? Math.round((direct.actual[i] / b) * 100) : 0
    )

    const varianceBudget = direct.varianceBudget.map((v: number) => -v)
    const varianceRoadmap = direct.varianceRoadmap.map((v: number) => -v)

    // Chart 1: Headcount
    seriesHeadcount.value = [
      { name: 'Target Budget', type: 'line', data: direct.targetBudget },
      { name: 'Target Roadmap', type: 'line', data: direct.targetRoadmap },
      { name: 'Actual', type: 'line', data: direct.actual }
    ]

    optionsHeadcount.value = {
      chart: {
        height: 400,
        type: 'line',
        zoom: { enabled: false },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        }
      },
      stroke: { curve: 'smooth', width: 2 },
      markers: { size: 4 },
      xaxis: {
        categories: months,
        title: { text: 'Month' }
      },
      yaxis: {
        title: { text: 'Headcount' },
        min: 0
      },
      tooltip: {
        shared: true,
        y: {
          formatter: (val: number) => typeof val === 'number' ? val.toFixed(0) : val
        }
      },
      colors: ['#008FFB', '#00E396', '#FEB019'],
      legend: { position: 'top', fontSize: '13px' }
    }

    // Chart 2: Fill Rate & Variance
    seriesFillRate.value = [
      { name: 'Fill Rate (%)', type: 'line', data: fillRate },
      { name: '± Budget', type: 'column', data: varianceBudget },
      { name: '± Roadmap', type: 'column', data: varianceRoadmap }
    ]

    optionsFillRate.value = {
      chart: {
        height: 400,
        type: 'line',
        zoom: { enabled: false },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        }
      },
      stroke: { width: [3, 0, 0], curve: 'smooth' },
      markers: { size: 4 },
      plotOptions: {
        bar: { columnWidth: '35%', borderRadius: 4 }
      },
      xaxis: {
        categories: months,
        title: { text: 'Month' }
      },
      yaxis: [
        {
          title: { text: 'Fill Rate (%)' },
          min: 0,
          max: 100,
          labels: { formatter: (val: number) => `${val}%` }
        },
        {
          opposite: true,
          title: { text: 'Variance (±)', style: { color: '#999' } },
          labels: { style: { color: '#999' } }
        }
      ],
      tooltip: {
        shared: true,
        y: {
          formatter: (val: number) => typeof val === 'number' ? val.toFixed(0) : val
        }
      },
      colors: ['#775DD0', '#FF4560', '#FF66C4'],
      legend: { position: 'top', fontSize: '13px' }
    }
  } catch (err) {
    console.error('Failed to fetch direct labor chart data:', err)
  }
}
</script>

<style scoped>
strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}
</style>
