<!-- src/tacomponents/MonthlyApplicationLine.vue -->

<template>
  <v-card class="pa-4" elevation="3">
    <v-row justify="center">
      <v-col cols="12" class="text-center">
        <div class="chart-title mb-2">Number of Applications by Month</div>

        <apexchart
          type="line"
          height="300"
          :options="chartOptions"
          :series="seriesData"
        />

        <div v-if="!hasData" class="text-caption text-grey mt-2">
          No monthly data available.
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const props = defineProps({
  labels: {
    type: Array,
    default: () => [],
  },
  series: {
    type: Array,
    default: () => [],
  },
})

const safeLabels = computed(() => {
  return props.labels.length ? props.labels : MONTH_LABELS
})

const safeSeries = computed(() => {
  return safeLabels.value.map((_, index) => {
    const value = Number(props.series[index] || 0)
    return Number.isFinite(value) ? value : 0
  })
})

const hasData = computed(() => {
  return safeSeries.value.some((value) => value > 0)
})

const seriesData = computed(() => [
  {
    name: 'Applications',
    data: safeSeries.value,
  },
])

const chartOptions = computed(() => ({
  chart: {
    id: 'monthly-applications',
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
  },
  xaxis: {
    categories: safeLabels.value,
  },
  yaxis: {
    title: {
      text: 'Applications',
    },
    min: 0,
    forceNiceScale: true,
    labels: {
      formatter: (value) => Math.round(value),
    },
  },
  colors: ['#3f51b5'],
  dataLabels: {
    enabled: true,
    style: {
      fontSize: '12px',
    },
  },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  markers: {
    size: 4,
  },
  tooltip: {
    enabled: true,
    y: {
      formatter: (value) => {
        return `${value} application${value === 1 ? '' : 's'}`
      },
    },
  },
}))
</script>

<style scoped>
.chart-title {
  font-weight: 600;
  font-size: 16px;
  color: #444;
}
</style>