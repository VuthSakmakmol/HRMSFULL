<template>
  <v-card class="pa-4" elevation="3">
    <v-row justify="center">
      <!-- Donut Chart Full Width -->
      <v-col cols="12" class="text-center">
        <div class="chart-title mb-2">Sources of Applications</div>
        <apexchart
          type="donut"
          height="300"
          :options="chartOptions"
          :series="series"
        />
        <div v-if="!series.length" class="text-caption text-grey mt-2">
          No data available.
        </div>
      </v-col>


      <!-- Custom Legend Underneath -->
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
            <span class="legend-label">{{ label }} — {{ getPercent(index) }}%</span>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  colors: {
    type: Array,
    default: () => [
      '#2979FF', // Vivid Blue
  '#00C853', // Green
  '#FFEB3B', // Yellow
  '#AB47BC', // Violet
  '#FFC107', // Amber
  '#F50057', // Pink
  '#7E57C2', // Purple
  '#BDBDBD', // Gray
  '#FF7043', // Deep Orange
  '#26C6DA', // Cyan
    ]
  }
})

const chartOptions = computed(() => ({
  labels: props.labels,
  chart: { type: 'donut', toolbar: { show: false } },
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
  display: inline-block;
  margin-right: 6px;
  border-radius: 2px;
}

.chart-title {
  font-weight: 600;
  font-size: 16px;
  color: #444;
}

</style>
