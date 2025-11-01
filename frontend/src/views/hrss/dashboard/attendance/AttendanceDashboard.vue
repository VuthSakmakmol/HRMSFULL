<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5 font-weight-bold">Attendance Dashboard</h2>

      <!-- 🌐 Global Filters -->
      <div class="d-flex gap-3">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 160px"
        />
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          item-title="title"
          item-value="value"
          label="Select Month"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 160px"
        />
      </div>
    </div>

    <!-- Section Switcher -->
    <div class="mb-4">
      <v-btn-toggle v-model="activeSection" mandatory divided>
        <v-btn :value="'sewing'" variant="flat">Sewing Summary</v-btn>
        <v-btn :value="'indirect'" variant="flat">Indirect + Merchandising</v-btn>
        <v-btn :value="'absentCompare'" variant="flat">Compare Absent Rate</v-btn>
        <v-btn :value="'turnover'" variant="flat">Turnover</v-btn>
        <v-btn :value="'analytics'" variant="flat">Analytics</v-btn>
        <v-btn :value="'dailyReport'" variant="flat">Daily Report</v-btn>
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

      <!-- 📊 Analytics (NEW, uses /attendance/series) -->
      <v-window-item value="analytics">
        <v-card class="pa-4 mb-4">
          <AttendanceAnalytics
            class="mb-4"
            v-model:modelValueDate="selectedDate"
            v-model:modelValueShift="selectedShift"
          />
        </v-card>
      </v-window-item>

      <!-- 📅 Daily Attendance Report -->
      <v-window-item value="dailyReport">
        <v-card class="pa-4 mb-4">
          <DailyAttendanceReport />
        </v-card>
      </v-window-item>

    </v-window>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from '@/plugins/dayjs'

import PeriodOfSewingDepartmentAttendanceSummary from './PeriodOfSewingDepartmentAttendanceSummary.vue'
import PeriodOfIndirectDepartmentAttendanceSummary from './PeriodOfIndirectDepartmentAttendanceSummary.vue'
import CompareAbentRate from './CompareAbentRate.vue'
import TurnOver from './TurnOver.vue'

// MVC nv AttendanceController
import AttendanceAnalytics from '@/components/hrss/AttendanceAnalytics.vue'

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const activeSection = ref('absentCompare') // default section

// 🔁 Two-way bindings for AttendanceAnalytics
const selectedDate = ref(dayjs().format('YYYY-MM-DD')) // initial = today
const selectedShift = ref('All') // 'All' | 'Day Shift' | 'Night Shift'

const yearOptions = Array.from({ length: 6 }, (_, i) => 2020 + i)

// 📅 Month options with abbreviations
const monthOptions = [
  { title: 'Jan', value: 1 },
  { title: 'Feb', value: 2 },
  { title: 'Mar', value: 3 },
  { title: 'Apr', value: 4 },
  { title: 'May', value: 5 },
  { title: 'Jun', value: 6 },
  { title: 'Jul', value: 7 },
  { title: 'Aug', value: 8 },
  { title: 'Sep', value: 9 },
  { title: 'Oct', value: 10 },
  { title: 'Nov', value: 11 },
  { title: 'Dec', value: 12 }
]
</script>

<style scoped>
.v-btn-toggle .v-btn {
  text-transform: none;
  font-weight: 600;
}
</style>
