<template>
  <div>
    <strong>Indirect Labor Chart</strong>
    <apexchart
      v-if="series.length"
      type="line"
      height="450"
      :options="options"
      :series="series"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

interface Category {
  key: string
  title: string
  targetBudget: number[]
  targetRoadmap: number[]
  actual: number[]
  varianceBudget: number[]
  varianceRoadmap: number[]
}

const series = ref<any[]>([])
const options = ref<any>({})

const formatMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1)
    .toLocaleString('default', { month: 'short' })
}

onMounted(async () => {
  const year = new Date().getFullYear()
  const { data } = await axios.get('/excome/manpower/targets', {
    params: { year }
  })

  // grab the "indirect" slice
  const indirect: Category = data.categories.find((c: Category) => c.key === 'indirect')
  const months = data.months.map(formatMonth)

  // compute fill‐rate %
  const fillRate = indirect.targetBudget.map((b, i) =>
    b > 0 ? Math.round(indirect.actual[i] / b * 100) : 0
  )

  // flip sign on variances so that positive means over-target, negative is under
  const varianceBudget  = indirect.varianceBudget .map(v => -v)
  const varianceRoadmap = indirect.varianceRoadmap.map(v => -v)

  // determine how low to allow the primary axis so negative dips show
  const allVars = [...varianceBudget, ...varianceRoadmap]
  const minVar  = Math.min(0, ...allVars)
  const yMin    = Math.floor(minVar * 1.2)

  series.value = [
    { name: 'Target Budget',   type: 'column', data: indirect.targetBudget   },
    { name: 'Target Roadmap',  type: 'column', data: indirect.targetRoadmap  },
    { name: 'Actual',          type: 'column', data: indirect.actual         },
    { name: '+/- Budget',      type: 'line',   data: varianceBudget          },
    { name: '+/- Roadmap',     type: 'line',   data: varianceRoadmap         },
    { name: 'Fill Rate (%)',   type: 'line',   data: fillRate               }
  ]

  options.value = {
    colors: [
      '#008FFB', // Target Budget
      '#00E396', // Target Roadmap
      '#FEB019', // Actual
      '#FF4560', // +/- Budget (red)
      '#FF4560', // +/- Roadmap (red)
      '#775DD0'  // Fill Rate
    ],
    chart: {
      stacked: false,
      toolbar: { show: false }
    },
    stroke: {
      width: [0, 0, 0, 2, 2, 3]
    },
    plotOptions: {
      bar: { columnWidth: '50%' }
    },
    xaxis: { categories: months },
    yaxis: [
      {
        title: { text: 'Headcount', style: { fontWeight: 500 } },
        min: yMin
      },
      {
        opposite: true,
        title: { text: 'Percentage', style: { fontWeight: 500 } },
        labels: { formatter: (val: number) => `${val}%` },
        min: 0,
        max: 100
      }
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: [
        { formatter: (v: number) => `${v}` },    // Budget
        { formatter: (v: number) => `${v}` },    // Roadmap
        { formatter: (v: number) => `${v}` },    // Actual
        { formatter: (v: number) => `${v}` },    // +/- Budget
        { formatter: (v: number) => `${v}` },    // +/- Roadmap
        { formatter: (v: number) => `${v}%` }    // Fill rate
      ]
    },
    legend: { position: 'top' }
  }
})
</script>

<style scoped>
strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}
</style>
