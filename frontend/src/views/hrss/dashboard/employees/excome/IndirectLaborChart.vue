<template>
  <div>
    <strong>📊 Indirect Labor Headcount</strong>
    <apexchart
      v-if="seriesHeadcount.length"
      type="line"
      height="400"
      :options="optionsHeadcount"
      :series="seriesHeadcount"
    />

    <br />

    <strong>📈 Fill Rate and Variance</strong>
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

// Reactive chart data
const seriesHeadcount = ref<any[]>([])
const optionsHeadcount = ref<any>({})
const seriesFillRate = ref<any[]>([])
const optionsFillRate = ref<any>({})

// Format YYYY-MM into short month-year
const formatMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
}

// Watch year changes and reload chart
watch(() => props.year, fetchChartData, { immediate: true })

async function fetchChartData() {
  try {
    const { data } = await axios.get('/hrss/excome/manpower/targets', {
      params: { year: props.year }
    })

    const indirect: Category = data.categories.find((c: Category) => c.key === 'indirect')
    const months = data.months.map(formatMonth)

    if (!indirect) return

    const fillRate = indirect.targetBudget.map((b, i) =>
      b > 0 ? Math.round((indirect.actual[i] / b) * 100) : 0
    )

    const varianceBudget = indirect.varianceBudget.map(v => -v)
    const varianceRoadmap = indirect.varianceRoadmap.map(v => -v)

    const maxHeadcount = Math.max(
      ...indirect.targetBudget,
      ...indirect.targetRoadmap,
      ...indirect.actual,
      ...varianceBudget,
      ...varianceRoadmap,
      1
    )

    // Chart 1: Headcount
    seriesHeadcount.value = [
      { name: 'Target Budget', type: 'line', data: indirect.targetBudget },
      { name: 'Target Roadmap', type: 'line', data: indirect.targetRoadmap },
      { name: 'Actual', type: 'line', data: indirect.actual }
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
        min: 0,
        max: Math.ceil(maxHeadcount * 1.2)
      },
      tooltip: {
        shared: true,
        y: {
          formatter: val => typeof val === 'number' ? val.toFixed(0) : val
        }
      },
      colors: ['#008FFB', '#00E396', '#FEB019'],
      legend: { position: 'top', fontSize: '13px' }
    }

    // Chart 2: Fill Rate and Variance
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
          labels: { formatter: val => `${val}%` }
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
          formatter: val => typeof val === 'number' ? val.toFixed(0) : val
        }
      },
      colors: ['#775DD0', '#FF4560', '#FF66C4'],
      legend: { position: 'top', fontSize: '13px' }
    }

  } catch (err) {
    console.error('❌ Failed to load Indirect Labor Chart:', err)
  }
}

interface Category {
  key: string
  title: string
  targetBudget: number[]
  targetRoadmap: number[]
  actual: number[]
  varianceBudget: number[]
  varianceRoadmap: number[]
}
</script>

<style scoped>
strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}
</style>
