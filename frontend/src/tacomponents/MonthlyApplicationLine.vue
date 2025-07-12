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

        <div v-if="seriesData[0].data.length === 0" class="text-caption text-grey mt-2">
          No monthly data available.
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] } // series of numbers
})

// Wrap series inside Apex format
const seriesData = computed(() => [
  {
    name: 'Applications',
    data: props.series
  }
])

const chartOptions = computed(() => ({
  chart: {
    id: 'monthly-applications',
    toolbar: { show: false },
    animations: { enabled: false }
  },
  xaxis: {
    categories: props.labels
  },
  yaxis: {
    title: {
      text: 'Applications'
    }
  },
  colors: ['#3f51b5'],
  dataLabels: {
    enabled: true,
    style: { fontSize: '12px' }
  },
  stroke: {
    curve: 'smooth'
  },
  tooltip: {
    enabled: true
  }
}))
</script>

<style scoped>
.chart-title {
  font-weight: 600;
  font-size: 16px;
  color: #444;
}
</style>
