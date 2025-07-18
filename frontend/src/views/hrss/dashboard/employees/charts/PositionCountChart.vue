<template>
  <v-card flat class="pa-2 rounded-lg elevation-1" height="100%">
    <v-icon start color="pink" size="20">mdi-chart-line</v-icon>
    <span class="ml-2">Sewer &amp; Jumper</span>

    <v-card-text>
      <ApexChart
        v-if="chartData.labels.length"
        type="bar"
        height="300"
        :options="chartOptions"
        :series="chartSeries"
      />
      <v-container v-else class="text-center">
        <v-icon size="36">mdi-chart-bar</v-icon>
        <p class="text-caption text-grey">No data available</p>
      </v-container>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import ApexChart from 'vue3-apexcharts'

const props = defineProps({
  chartData: {
    type: Object,
    required: true,
  }
})

const chartSeries = computed(() => [
  { name: 'Sewer',    data: props.chartData.sewer    || [] },
  { name: 'Jumper',   data: props.chartData.jumper   || [] },
  { name: 'Combined', data: props.chartData.combined || [] }
])

const chartOptions = computed(() => ({
  chart:    { toolbar: { show: false }, zoom: { enabled: false } },
  plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
  dataLabels:  { enabled: true, style: { fontSize: '11px' } },
  xaxis: { categories: props.chartData.labels, title: { text: 'Month' }, labels: { rotate: -45, style: { fontSize: '11px' } } },
  yaxis: { title: { text: 'Employees' }, min: 0, labels: { style: { fontSize: '11px' } } },
  legend: { position: 'top' }
}))
</script>
