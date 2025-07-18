<template>
  <v-card flat class="pa-2 rounded-lg elevation-1" height="100%">
    <v-icon start color="pink" size="20">mdi-chart-line</v-icon>
    <span class="ml-2">Employee Join Trends</span>

    <div v-if="chartData.labels.length">
      <apexchart
        type="line"
        height="240"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>
    <v-container v-else class="text-center">
      <v-icon size="36">mdi-chart-line</v-icon>
      <p class="text-caption text-grey">
        No data available
      </p>
    </v-container>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  chartData: {
    type: Object,
    required: true,
    // { labels: string[], counts: number[] }
  }
})

const chartSeries = computed(() => [{
  name: 'Joins',
  data: props.chartData.counts
}])

const chartOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  stroke: { curve: 'smooth' },
  markers: { size: 4 },
  xaxis: {
    categories: props.chartData.labels,
    labels: { rotate: -45, style: { fontSize: '11px' } }
  },
  yaxis: {
    title: { text: 'Employees' },
    labels: { style: { fontSize: '11px' } }
  },
  dataLabels: {
    enabled: true,
    style: { fontSize: '11px' }
  }
}))
</script>
