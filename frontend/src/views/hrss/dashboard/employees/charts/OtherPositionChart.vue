<template>
  <v-card flat class="pa-2 rounded-lg elevation-1" height="100%">
    <v-card-title class="text-subtitle-2 font-weight-medium d-flex align-center mb-2">
      <v-icon start color="pink" size="20">mdi-chart-line</v-icon>
      <span class="ml-2">
        {{ title }}
        <span class="font-weight-bold">({{ total }})</span>
      </span>
    </v-card-title>

    <v-card-text>
      <apexchart
        v-if="chartData.labels.length && series.length"
        type="line"
        height="300"
        :options="chartOptions"
        :series="series"
      />
      <v-container v-else class="text-center">
        <v-icon size="36">mdi-chart-line</v-icon>
        <p class="text-caption text-grey">No data available</p>
      </v-container>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import ApexChart from 'vue3-apexcharts'

const props = defineProps({
  title:     { type: String, required: true },
  chartData: {
    type: Object,
    required: true,
    // { labels: string[], series: Array<{ name: string, data: number[] }> }
  }
})

// all series (one per position)
const series = computed(() => props.chartData.series || [])

// sum up every data point across all series
const total = computed(() =>
  series.value.reduce(
    (sum, s) => sum + (s.data || []).reduce((a, b) => a + b, 0),
    0
  )
)

const chartOptions = computed(() => ({
  chart:    { toolbar:{ show:false }, zoom:{ enabled:false } },
  stroke:   { curve:'smooth', width: 2 },
  markers:  { size:4 },
  xaxis:    {
    categories: props.chartData.labels,
    labels:     { rotate:-45, style:{ fontSize:'11px' } }
  },
  yaxis:    {
    title:  { text:'Employees' },
    labels: { style:{ fontSize:'11px' } },
    min:     0
  },
  dataLabels:{ enabled:true, style:{ fontSize:'11px' } },
  legend:   { position:'top' }
}))
</script>
