<template>
  <v-card class="pa-4" elevation="3">
    <v-row justify="center">
      <!-- Donut Chart -->
      <v-col cols="12" class="text-center">
        <div class="chart-title mb-2">Sources of Applications</div>
        <apexchart
          type="donut"
          height="300"
          :options="chartOptions"
          :series="orderedSeries"
        />
        <div v-if="!orderedSeries.reduce((a, b) => a + b, 0)" class="text-caption text-grey mt-2">
          No data available.
        </div>
      </v-col>

      <!-- Custom Legend -->
      <v-col cols="12">
        <div class="legend-wrap">
          <div
            v-for="(label, index) in orderedLabels"
            :key="index"
            class="legend-item"
          >
            <span
              class="legend-color"
              :style="{ backgroundColor: labelColorMap[label] || fallbackColors[index % fallbackColors.length] }"
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
  labels: { type: Array, default: () => [] }
})

// ✅ Optional: fixed label-color map for common sources
const labelColorMap = {
  'Agency': '#00C853',                      // Green
  'Banner / Job Announcement Board': '#FFEB3B', // Yellow
  'Brochure': '#2979FF',                    // Blue
  'FIF': '#AB47BC',                         // Purple
  'Facebook': '#FFC107',                    // Amber
  'HR Call': '#F50057',                     // Pink
  'Job Portal': '#7E57C2',                  // Violet
  'LinkedIn': '#26C6DA',                    // Cyan
  'Telegram': '#FF7043',                    // Orange
  'Other': '#BDBDBD'                        // Gray
};


// ✅ Fallback colors (looped if new labels arrive dynamically)
const fallbackColors = [
  '#2979FF', '#00C853', '#FFEB3B', '#AB47BC', '#FFC107',
  '#F50057', '#7E57C2', '#BDBDBD', '#FF7043', '#26C6DA'
]

// ✅ Order labels alphabetically or your preferred order
const orderedLabels = computed(() => {
  const labelsCopy = [...props.labels];
  labelsCopy.sort((a, b) => a.localeCompare(b));
  return labelsCopy;
});

// ✅ Align series with ordered labels
const orderedSeries = computed(() => {
  return orderedLabels.value.map(label => {
    const idx = props.labels.indexOf(label);
    return idx !== -1 ? props.series[idx] : 0;
  });
});

const chartOptions = computed(() => ({
  labels: orderedLabels.value,
  chart: {
    type: 'donut',
    toolbar: { show: false },
    animations: { enabled: false }, // 🔥 disable animations
  },
  legend: { show: false },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${val.toFixed(0)}%`,
    style: { fontSize: '12px' }
  },
  colors: orderedLabels.value.map(label => labelColorMap[label] || fallbackColors[orderedLabels.value.indexOf(label) % fallbackColors.length])
}));

const getPercent = (index) => {
  const total = orderedSeries.value.reduce((a, b) => a + b, 0)
  return total ? ((orderedSeries.value[index] / total) * 100).toFixed(0) : 0
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
