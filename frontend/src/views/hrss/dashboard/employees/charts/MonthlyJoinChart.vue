<template>
  <v-card
    flat
    class="pa-2 rounded-lg elevation-1"
    height="100%"
    style="background-color: #f5f7fa"
  >
    <!-- 🔖 Title -->
    <v-card-title class="text-subtitle-2 font-weight-medium d-flex align-center mb-2">
      <v-icon start color="pink" size="20">mdi-calendar-month</v-icon>
      Monthly Employee Joins
    </v-card-title>

    <!-- 📊 Chart -->
    <div v-if="Array.isArray(chartData.counts) && chartData.counts.length">
      <apexchart
        type="bar"
        height="220"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>

    <!-- 🚫 No Data -->
    <v-container v-else class="text-center">
      <v-icon size="36">mdi-chart-bar</v-icon>
      <p class="text-caption text-grey">No monthly data available</p>
    </v-container>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  chartData: {
    type: Object,
    default: () => ({
      labels: [],
      counts: []
    })
  }
})

// 📊 Series
const chartSeries = computed(() => [
  {
    name: 'Joins',
    data: Array.isArray(props.chartData.counts) ? props.chartData.counts : []
  }
])

// ⚙️ Options
const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false }
  },
  xaxis: {
    categories: Array.isArray(props.chartData.labels) ? props.chartData.labels : [],
    labels: { rotate: -45, style: { fontSize: '11px' } }
  },
  yaxis: {
    title: { text: 'Employees' },
    labels: { style: { fontSize: '11px' } }
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: '45%'
    }
  },
  dataLabels: {
    enabled: true,
    style: { fontSize: '11px' }
  },
  colors: ['#FF4081']
}))
</script>

<style scoped>
/* Optional custom style */
</style>
