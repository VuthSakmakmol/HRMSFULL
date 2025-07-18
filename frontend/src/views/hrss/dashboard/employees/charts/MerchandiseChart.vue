<template>
  <v-card flat class="pa-2 rounded-lg elevation-1" height="100%">
    <v-card-title class="text-subtitle-2 font-weight-medium d-flex align-center mb-2">
      <v-icon start color="pink" size="20">mdi-chart-line</v-icon>
      <span class="ml-2">{{ title }}</span>
    </v-card-title>
    <v-card-text>
      <apexchart
        v-if="chartData.labels.length"
        type="line"
        height="240"
        :options="chartOptions"
        :series="chartSeries"
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

const props = defineProps({
  title:     { type: String, required: true },
  chartData: { type: Object, required: true }
})

const chartSeries = computed(() => [{
  name: 'Joins',
  data: props.chartData.counts
}])

const chartOptions = computed(() => ({
  chart:    { toolbar:{ show:false } },
  stroke:   { curve:'smooth' },
  markers:  { size:4 },
  xaxis:    { categories: props.chartData.labels, labels:{ rotate:-45 } },
  yaxis:    { title:{ text:'Employees' } },
  dataLabels:{ enabled:true }
}))
</script>
