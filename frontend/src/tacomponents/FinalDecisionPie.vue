<template>
  <v-card class="pa-4 chart-card" elevation="3">
    <v-row justify="center">
      <v-col cols="12" class="text-center">
        <div class="chart-title mb-2">Final Hiring Decisions</div>

        <!-- ✅ Chart Render -->
        <div class="chart-wrapper">
          <apexchart
            type="pie"
            height="300"
            :options="chartOptions"
            :series="series"
          />

          <!-- ❗ Message when data is zero -->
          <div
            v-if="series.reduce((a, b) => a + b, 0) === 0"
            class="empty-overlay"
          >
            No decision data available.
          </div>
        </div>
      </v-col>

      <!-- 🔍 Legend -->
      <v-col cols="12">
        <div class="legend-wrap">
          <div
            v-for="(label, index) in labels"
            :key="index"
            class="legend-item"
          >
            <span
              class="legend-color"
              :style="{ backgroundColor: colors[index % colors.length] }"
            ></span>
            <span class="legend-label">
              {{ label }} — {{ getPercent(index) }}%
            </span>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  series: { type: Array, default: () => [] },   // [3, 1, 2, 0]
  labels: { type: Array, default: () => [] },   // ['Hired', 'Not Hired', 'In Process', 'Candidate Refused']
  colors: {
    type: Array,
    default: () => [
      '#2979FF', // Hired
      '#D32F2F', // Not Hired
      '#9E9E9E', // In Process
      '#00C853'  // Candidate Refused
    ]
  }
})

const chartOptions = computed(() => ({
  labels: props.labels,
  chart: {
    type: 'pie',
    toolbar: { show: false }
  },
  legend: { show: false },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${val.toFixed(0)}%`,
    style: { fontSize: '12px' }
  },
  colors: props.colors
}))

const getPercent = (index) => {
  const total = props.series.reduce((a, b) => a + b, 0)
  return total ? ((props.series[index] / total) * 100).toFixed(0) : 0
}
</script>

<style scoped>
.chart-title {
  font-weight: 600;
  font-size: 16px;
  color: #444;
}

.chart-wrapper {
  position: relative;
  min-height: 300px;
}

.empty-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  color: #888;
  pointer-events: none;
}

.legend-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 24px;
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #555;
}

.legend-color {
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border-radius: 2px;
}
</style>
