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
            :series="orderedSeries"
          />

          <!-- ❗ Message when data is zero -->
          <div
            v-if="orderedSeries.reduce((a, b) => a + b, 0) === 0"
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
            v-for="(label, index) in orderedLabels"
            :key="index"
            class="legend-item"
          >
            <span
              class="legend-color"
              :style="{ backgroundColor: labelColorMap[label] }"
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
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
})

// ✅ Fixed label-to-color mapping in your preferred order
const labelColorMap = {
  'Hired': '#2979FF',
  'Not Hired': '#D32F2F',
  'Candidate Refusal': '#00C853',
  'Candidate in Process': '#9E9E9E',
};

// ✅ Always use these 4 labels in fixed order
const orderedLabels = computed(() => Object.keys(labelColorMap));

// ✅ Ordered series: match data to ordered labels, filling with 0 if missing
const orderedSeries = computed(() => {
  return orderedLabels.value.map(label => {
    const idx = props.labels.indexOf(label);
    return idx !== -1 ? props.series[idx] : 0;
  });
});

// ✅ Chart options with stable colors and disabled animations
const chartOptions = computed(() => ({
  labels: orderedLabels.value,
  chart: {
    type: 'pie',
    toolbar: { show: false },
    animations: { enabled: false }
  },
  legend: { show: false },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${val.toFixed(0)}%`,
    style: { fontSize: '12px' }
  },
  colors: orderedLabels.value.map(label => labelColorMap[label])
}));

// ✅ Calculate percent for legend display
const getPercent = (index) => {
  const total = orderedSeries.value.reduce((a, b) => a + b, 0)
  return total ? ((orderedSeries.value[index] / total) * 100).toFixed(0) : 0
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
