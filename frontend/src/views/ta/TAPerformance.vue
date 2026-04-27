<!-- src/views/ta/TAPerformance.vue -->

<template>
  <v-container fluid class="pa-2 pt-0">
    <v-sheet elevation="2" class="sticky-filter pa-3" color="white">
      <div class="page-title-row mb-3">
        <div>
          <h2 class="page-title">TA Performance</h2>
        </div>
      </div>

      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filterType"
            :items="filterOptions"
            label="Candidate Type"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="viewMode"
            :items="viewOptions"
            label="Report View"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-select
            v-model="selectedYear"
            :items="yearOptions"
            label="Select Year"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col v-if="viewMode === 'quarter'" cols="12" sm="6" md="2">
          <v-select
            v-model="selectedQuarter"
            :items="quarterOptions"
            item-title="label"
            item-value="value"
            label="YTD Until Quarter"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col v-if="viewMode === 'month'" cols="12" sm="6" md="2">
          <v-select
            v-model="selectedMonth"
            :items="monthOptions"
            item-title="label"
            item-value="value"
            label="YTD Until Month"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>
    </v-sheet>

    <v-row class="mt-3">
      <v-col cols="12">
        <RecruitmentReportTable
          :type="currentType.type"
          :subType="currentType.subType"
          :view="viewMode"
          :year="selectedYear"
          :quarter="selectedQuarter"
          :month="selectedMonth"
          :company="selectedCompany"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// src/views/ta/TAPerformance.vue

import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'

import RecruitmentReportTable from '@/tacomponents/RecruitmentReportTable.vue'

const filterType = ref('White Collar')

const filterOptions = [
  'White Collar',
  'Blue Collar - Sewer',
  'Blue Collar - Non-Sewer',
]

const viewMode = ref('month')

const viewOptions = [
  'month',
  'quarter',
  'year',
]

const selectedYear = ref(dayjs().year())

const selectedMonth = ref(dayjs().month() + 1)
const selectedQuarter = ref(Math.floor(dayjs().month() / 3) + 1)

const selectedCompany = ref(localStorage.getItem('company') || '')

const yearOptions = Array.from({ length: 6 }, (_, i) => dayjs().year() - i)

const monthOptions = [
  { label: 'Jan YTD', value: 1 },
  { label: 'Feb YTD', value: 2 },
  { label: 'Mar YTD', value: 3 },
  { label: 'Apr YTD', value: 4 },
  { label: 'May YTD', value: 5 },
  { label: 'Jun YTD', value: 6 },
  { label: 'Jul YTD', value: 7 },
  { label: 'Aug YTD', value: 8 },
  { label: 'Sep YTD', value: 9 },
  { label: 'Oct YTD', value: 10 },
  { label: 'Nov YTD', value: 11 },
  { label: 'Dec YTD', value: 12 },
]

const quarterOptions = [
  { label: 'Q1 YTD', value: 1 },
  { label: 'Q2 YTD', value: 2 },
  { label: 'Q3 YTD', value: 3 },
  { label: 'Q4 YTD', value: 4 },
]

const currentType = computed(() => {
  if (filterType.value === 'Blue Collar - Sewer') {
    return {
      type: 'Blue Collar',
      subType: 'Sewer',
    }
  }

  if (filterType.value === 'Blue Collar - Non-Sewer') {
    return {
      type: 'Blue Collar',
      subType: 'Non-Sewer',
    }
  }

  return {
    type: 'White Collar',
    subType: null,
  }
})

watch(viewMode, (newView) => {
  if (newView === 'month') {
    selectedQuarter.value = null

    if (!selectedMonth.value) {
      selectedMonth.value = dayjs().month() + 1
    }

    return
  }

  if (newView === 'quarter') {
    selectedMonth.value = null

    if (!selectedQuarter.value) {
      selectedQuarter.value = Math.floor(dayjs().month() / 3) + 1
    }

    return
  }

  selectedMonth.value = null
  selectedQuarter.value = null
})
</script>

<style scoped>
.sticky-filter {
  position: sticky;
  top: 5px;
  z-index: 10;
  background-color: white;
  border-radius: 10px;
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #263238;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: #607d8b;
  margin: 2px 0 0;
}
</style>