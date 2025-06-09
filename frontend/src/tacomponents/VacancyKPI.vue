<template>
  <v-card class="pa-4" elevation="3">
    <v-card-title class="text-h6 mb-2">
      <v-icon color="primary" start>mdi-clipboard-text</v-icon>Vacancies Staticstics -
      {{ typeLabel || 'Vacancy KPI' }}
    </v-card-title>
    <v-divider class="mb-4" />

    <div v-if="loading" class="d-flex align-center justify-center" style="height: 300px;">
      <v-progress-circular indeterminate color="primary" size="50" />
    </div>

    <template v-else>
      <!-- KPI Section -->
      <v-row class="mt-4">
        <v-col cols="12" md="8" class="mt-6">
          <v-row dense>
            <v-col
              v-for="(item, index) in kpiList"
              :key="index"
              cols="12"
              sm="6"
              class="mb-2"
            >
              <v-sheet class="pa-2 kpi-box" elevation="1">
                <div class="text-caption text-grey-darken-1">{{ item.label }}</div>
                <div class="text-body-2 font-weight-bold text-primary">
                  {{ format(item.value, item.isMoney) }}
                </div>
              </v-sheet>
            </v-col>
          </v-row>
        </v-col>

        <v-col cols="12" md="4" class="d-flex align-center justify-center">
          <div class="fillrate-circle-container">
            <div class="text-caption text-center mt-1 mb-2">Filled Rate</div>
            <svg viewBox="0 0 36 36" class="circular-chart">
              <path
                class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="circle"
                :stroke-dasharray="fillRate + ', 100'"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" class="percentage">{{ fillRate }}%</text>
            </svg>
          </div>
        </v-col>
      </v-row>
    </template>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  typeLabel: String,
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false }
})

const format = (val, isMoney) => {
  if (isMoney) return `$${parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  return val ?? 0
}

const fillRate = computed(() => parseFloat(props.data.fillRate || 0).toFixed(1))

const kpiList = computed(() => [
  { label: 'Total Hiring Cost ($)', value: props.data.hiringCost, isMoney: true },
  { label: 'Cost per Hire ($)', value: props.data.costPerHire, isMoney: true },
  { label: 'Avg Days to Hire', value: props.data.averageDaysToHire },
  { label: 'Active Vacancies', value: props.data.activeVacancies }
])
</script>

<style scoped>
.kpi-box {
  border-left: 3px solid #1976d2;
  background-color: #f4f7fd;
  border-radius: 8px;
}

.fillrate-circle-container {
  max-width: 180px;
  width: 100%;
}

.circular-chart {
  width: 100%;
  height: auto;
}

.circle-bg {
  fill: none;
  stroke: #ececec;
  stroke-width: 3;
}

.circle {
  fill: none;
  stroke: #1976d2;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease-out;
}

.percentage {
  fill: #1976d2;
  font-size: 0.5rem;
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>
