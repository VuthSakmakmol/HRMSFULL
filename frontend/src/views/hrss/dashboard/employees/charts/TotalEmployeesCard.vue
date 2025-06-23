<template>
  <v-col cols="12" sm="6">
    <v-card flat class="pa-4 rounded-lg" style="background:#f7f9fc; height:100%">
      <v-row align="center" justify="space-between">
        <div>
          <div class="text-subtitle-2 font-weight-medium d-flex align-center mb-1">
            <v-icon start color="purple" size="20">mdi-account-group</v-icon>
            Total Employees
          </div>
          <div class="text-h5 font-weight-bold text-primary">{{ total }}</div>
        </div>
        <v-avatar size="40" color="blue-lighten-4">
          <v-icon color="primary">mdi-account-multiple</v-icon>
        </v-avatar>
      </v-row>

      <!-- Sparkline Trend Chart -->
      <apexchart
        type="line"
        height="60"
        :options="sparklineOptions"
        :series="[{ name: 'Employees', data: trend }]"
      />
    </v-card>
  </v-col>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: Number,
  trend: {
    type: Array,
    default: () => []
  }
})

const sparklineOptions = computed(() => ({
  chart: {
    type: 'line',
    sparkline: { enabled: true },
    background: 'transparent'
  },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  tooltip: {
    enabled: true,
    x: { show: false },
    y: {
      formatter: val => `${val} employees`
    }
  },
  colors: ['#42A5F5']
}))
</script>
