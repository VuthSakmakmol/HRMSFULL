<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h5 font-weight-bold mb-6">📊 Attendance Dashboard</h2>

    <!-- 🌐 Global Filters -->
    <v-row class="mb-6">
      <v-col cols="12" sm="3">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          variant="outlined"
          density="comfortable"
        />
      </v-col>

      <v-col cols="12" sm="3">
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          label="Select Month"
          variant="outlined"
          density="comfortable"
        />
      </v-col>
    </v-row>

    <!-- 🧵 Sewing Summary -->
    <PeriodOfSewingDepartmentAttendanceSummary
      :year="selectedYear"
      :month="selectedMonth"
    />

    <!-- 🏢 Indirect + Merchandising Summary -->
    <PeriodOfIndirectDepartmentAttendanceSummary
      :year="selectedYear"
      :month="selectedMonth"
    />

    <CompareAbentRate
      :year="selectedYear"
      :month="selectedMonth"
    />
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import PeriodOfSewingDepartmentAttendanceSummary from './PeriodOfSewingDepartmentAttendanceSummary.vue'
import PeriodOfIndirectDepartmentAttendanceSummary from './PeriodOfIndirectDepartmentAttendanceSummary.vue'
import CompareAbentRate from './CompareAbentRate.vue'

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

const yearOptions = Array.from({ length: 6 }, (_, i) => 2020 + i)
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
</script>
