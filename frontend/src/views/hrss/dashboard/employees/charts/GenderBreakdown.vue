<template>
  <v-card flat class="pa-2 rounded-lg elevation-1" height="100%" style="background-color: #f5f7fa">
    <v-card-title class="text-subtitle-2 font-weight-medium d-flex align-center mb-2">
      <v-icon start color="purple" size="20">mdi-account-group</v-icon>
      Gender Breakdown
    </v-card-title>

    <div v-if="chartSeries.length">
      <apexchart
        type="pie"
        height="180"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>

    <v-container v-else class="text-center">
      <v-icon size="36">mdi-chart-pie</v-icon>
      <p class="text-caption text-grey">No gender data available</p>
    </v-container>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

// Convert data to chart values
const chartSeries = computed(() =>
  props.data.map(entry => entry.count)
)

const chartOptions = computed(() => ({
  labels: props.data.map(entry => {
    const id = entry._id
    if (!id || id === '') return 'Other'
    return id
  }),
  colors: ['#2196F3', '#E91E63', '#FFC107'], // Male, Female, Other
  legend: {
    position: 'bottom',
    fontSize: '12px'
  },
  dataLabels: {
    style: {
      fontSize: '11px'
    }
  }
}))
</script>
