<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5 font-weight-bold">📊 Attendance Dashboard</h2>

      <!-- 🌐 Global Filters -->
      <div class="d-flex gap-3">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          variant="outlined"
          density="comfortable"
          hide-details
          style="max-width: 160px"
        />
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          label="Select Month"
          variant="outlined"
          density="comfortable"
          hide-details
          style="max-width: 160px"
        />
      </div>
    </div>

    <!-- Section Switcher -->
    <div class="mb-4">
      <v-btn-toggle v-model="activeSection" mandatory divided>
        <v-btn :value="'sewing'" variant="flat">🧵 Sewing Summary</v-btn>
        <v-btn :value="'indirect'" variant="flat">🏢 Indirect + Merchandising</v-btn>
        <v-btn :value="'absentCompare'" variant="flat">📉 Compare Absent Rate</v-btn>
        <v-btn :value="'turnover'" variant="flat">🔄 Turnover</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Content -->
    <v-window v-model="activeSection" class="rounded-xl">
      <!-- 🧵 Sewing Summary -->
      <v-window-item value="sewing">
        <v-card class="pa-4 mb-4">
          <PeriodOfSewingDepartmentAttendanceSummary
            :year="selectedYear"
            :month="selectedMonth"
          />
        </v-card>
      </v-window-item>

      <!-- 🏢 Indirect + Merchandising Summary -->
      <v-window-item value="indirect">
        <v-card class="pa-4 mb-4">
          <PeriodOfIndirectDepartmentAttendanceSummary
            :year="selectedYear"
            :month="selectedMonth"
            :departments="[
              'IE','Cutting','Finishing','Packing','HRSS','QA','Maintenance','Merchandising'
            ]"
          />
        </v-card>
      </v-window-item>

      <!-- 📉 Compare Absent Rate -->
      <v-window-item value="absentCompare">
        <v-card class="pa-4 mb-4">
          <CompareAbentRate
            :year="selectedYear"
            :month="selectedMonth"
          />
        </v-card>
      </v-window-item>

      <!-- 🔄 Turnover -->
      <v-window-item value="turnover">
        <v-card class="pa-4 mb-4">
          <TurnOver
            :year="selectedYear"
            :month="selectedMonth"
          />
        </v-card>
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import PeriodOfSewingDepartmentAttendanceSummary from './PeriodOfSewingDepartmentAttendanceSummary.vue'
import PeriodOfIndirectDepartmentAttendanceSummary from './PeriodOfIndirectDepartmentAttendanceSummary.vue'
import CompareAbentRate from './CompareAbentRate.vue'
import TurnOver from './TurnOver.vue'

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

const yearOptions = Array.from({ length: 6 }, (_, i) => 2020 + i)
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

// default visible section
const activeSection = ref('absentCompare') // or 'sewing' if you prefer
</script>

<style scoped>
.v-btn-toggle .v-btn {
  text-transform: none;
  font-weight: 600;
}
</style>
