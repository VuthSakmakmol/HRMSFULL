<template>
  <v-card class="pa-4" elevation="3">
    <v-row justify="center">
      <v-col cols="12" class="text-center">
        <!-- 🔹 Chart Title -->
        <div class="chart-title mb-2">Recruitment Pipeline</div>

        <!-- 📊 Horizontal Bar Chart -->
        <apexchart
          type="bar"
          height="350"
          :options="chartOptions"
          :series="series"
        />

        <!-- ℹ️ Message if no data -->
        <div v-if="!series[0].data.some(d => d > 0)" class="text-caption text-grey mt-2">
          No pipeline data.
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

// ✅ Props from Dashboard.vue
const props = defineProps({
  pipeline: {
    type: Object,
    default: () => ({})
  }
})

// ✅ Define display labels and backend keys
const stages = [
  { label: 'Application', key: 'Application' },
  { label: 'Manager Review', key: 'ManagerReview' },
  { label: 'Interview', key: 'Interview' },
  { label: 'Job Offer', key: 'JobOffer' },
  { label: 'Hired', key: 'Hired' },
  { label: 'Onboard', key: 'Onboard' }
]

// ✅ Extract pipeline values based on backend keys
const series = computed(() => [{
  name: 'Candidates',
  data: stages.map(s => props.pipeline[s.key] || 0)
}])

// ✅ ApexChart options for horizontal bar
const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: '50%'
    }
  },
  dataLabels: {
    enabled: true,
    style: {
      fontSize: '12px'
    }
  },
  xaxis: {
    categories: stages.map(s => s.label),
    labels: { style: { fontSize: '12px' } }
  },
  colors: ['#1976D2'] // Vuetify primary blue
}))
</script>

<style scoped>
.chart-title {
  font-weight: 600;
  font-size: 16px;
  color: #444;
}
</style>
