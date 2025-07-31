<template>
  <v-container fluid class="dashboard-container">

    <v-expansion-panels multiple>

      <!-- Section 1: Age and Year of Service -->
      <v-expansion-panel>
        <v-expansion-panel-title>
          📊 Age & Year of Service
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row dense class="chart-section">
            <v-col cols="12" sm="6" class="pa-2 dashboard-card card-avg-age">
              <AvgAgeCard />
            </v-col>

            <v-col cols="12" sm="6" class="pa-2 dashboard-card card-avg-service">
              <YearOfService />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Section 2: Headcount by Position -->
      <v-expansion-panel>
        <v-expansion-panel-title>
          👷 Headcount by Type
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row dense class="headcount-section">
            <v-col cols="12" class="dashboard-card">
              <TypeOfPosition />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Section 3: Charts -->
      <v-expansion-panel>
        <v-expansion-panel-title>
          📈 Direct & Indirect Labor Charts + Budget Summary
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row class="mb-4" align="center">
            <v-col cols="12" sm="4">
              <v-select
                v-model="selectedYear"
                :items="yearOptions"
                label="Select Year"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-row dense class="chart-section">
            <v-col cols="12" sm="6" class="pa-2 dashboard-card card-direct-chart">
              <DirectLaborChart :year="selectedYear" />
            </v-col>
            <v-col cols="12" sm="6" class="pa-2 dashboard-card card-indirect-chart">
              <IndirectLaborChart :year="selectedYear" />
            </v-col>
            <v-col cols="12" class="dashboard-card card-summary">
              <SummaryBudgetTable :year="selectedYear" />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Section 4: Resign Reasons -->
      <v-expansion-panel>
        <v-expansion-panel-title>
          📉 Resign Reason Summary
        </v-expansion-panel-title>
        <v-expansion-panel-text class="gap-2 flex">
          <v-row dense class="chart-section">
            <v-col cols="6" class="dashboard-card card-summary">
              <ReasonResignDirectTable :year="selectedYear" />
            </v-col>
            <v-col cols="6" class="dashboard-card card-summary">
              <ReasonResignDirectLabor :year="selectedYear" />
            </v-col>
            <v-col cols="6" class="dashboard-card card-summary">
              <ReasonResignIndirectTable :year="selectedYear" />
            </v-col>
            <v-col cols="6" class="dashboard-card card-summary">
              <ReasonResignIndirectLabor :year="selectedYear" />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>

    </v-expansion-panels>
    
  </v-container>
</template>


<script>
import axios from '@/utils/axios'
import TypeOfPosition      from './excome/TypeOfPosition.vue'
import SummaryBudgetTable  from './excome/SummaryBudgetTable.vue'
import DirectLaborChart    from './excome/DirectLaborChart.vue'
import IndirectLaborChart  from './excome/IndirectLaborChart.vue'
import AvgAgeCard          from './excome/AvgAgeCard.vue'
import YearOfService       from './excome/YearOfService.vue'
import ReasonResignDirectTable from './excome/ReasonResignDirectTable.vue'
import ReasonResignIndirectTable from './excome/ReasonResignIndirectTable.vue'
import ReasonResignDirectLabor from './excome/ReasonResignDirectLabor.vue'
import ReasonResignIndirectLabor from './excome/ReasonResignIndirectLabor.vue'


export default {
  name: 'ExcomeDashboard',
  components: {
    TypeOfPosition,
    SummaryBudgetTable,
    DirectLaborChart,
    IndirectLaborChart,
    AvgAgeCard,
    YearOfService,
    ReasonResignDirectTable,
    ReasonResignIndirectTable,
    ReasonResignDirectLabor,
    ReasonResignIndirectLabor,
  },
  data() {
    const currentYear = new Date().getFullYear()
    return {
      selectedYear: currentYear,
      yearOptions: Array.from({ length: 5 }, (_, i) => currentYear - i),
      selectedMonth: this.formatMonth(new Date()),

      counts: {
        directLabor: 0,
        marketing: 0,
        indirectLabor: 0
      }
    }
  },
  methods: {
    formatMonth(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      return `${y}-${m}`
    },

    async fetchCounts() {
      try {
        const res = await axios.get('/hrss/excome/employee-count', {
          params: { month: this.selectedMonth }
        })

        const isHTML = typeof res.data === 'string' && res.data.startsWith('<!DOCTYPE')
        if (isHTML) {
          console.warn('⚠️ API returned HTML instead of JSON')
          return
        }

        if (res.data?.counts) {
          this.counts = res.data.counts
        } else {
          console.warn('⚠️ Excome API returned no counts:', res.data)
        }
      } catch (err) {
        console.error('❌ Failed to load Excome headcount:', err)
      }
    }
  },
  mounted() {
    this.fetchCounts()
  }
}
</script>

<style scoped>
.dashboard-container {
  background-color: #f5f7fa;
  min-height: 100vh;
  padding: 1.5rem;
}

/* Month selector */
.month-selector {
  margin-bottom: 1.5rem;
}
.month-selector .v-text-field input {
  background-color: #ffffff;
  border-radius: 4px;
}

/* Base card styling */
.dashboard-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  margin-bottom: 1rem;
}

/* Colored variants */
.card-direct         { border-top: 4px solid #3b82f6; background-color: #eff6ff; }
.card-marketing      { border-top: 4px solid #10b981; background-color: #ecfdf5; }
.card-indirect       { border-top: 4px solid #f59e0b; background-color: #fffbeb; }
.card-avg-age        { border-top: 4px solid #ec4899; background-color: #fdf2f8; }
.card-direct-chart   { border-top: 4px solid #3b82f6; background-color: #eff6ff; }
.card-indirect-chart { border-top: 4px solid #f59e0b; background-color: #fffbeb; }
.card-summary        { border-top: 4px solid #8b5cf6; background-color: #f5f3ff; }
.card-avg-service    { border-top: 4px solid #6366f1; background-color: #eef2ff; }

/* Section spacing */
.headcount-section        { margin-bottom: 2rem; }
.avg-age-section          { margin-bottom: 2rem; }
.chart-section            { margin-bottom: 2rem; }
.summary-table-section    { margin-bottom: 2rem; }
.avg-service-section      { margin-bottom: 2rem; }

/* Typography tweaks */
.dashboard-container .v-label,
.dashboard-container .v-field label {
  font-weight: 500;
  color: #374151;
}

.dashboard-container .v-input__control {
  font-size: 0.95rem;
}

.chart-section .v-col {
  padding: 12px !important;
}

</style>
