<template>
  <v-container fluid class="dashboard-container">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h6 font-weight-bold">📊 Excome Dashboard</h2>

      <v-select
        v-model="selectedYear"
        :items="yearOptions"
        label="Select Year"
        variant="outlined"
        density="comfortable"
        hide-details
        style="max-width: 180px"
      />
    </div>

    <!-- Button Row (one-at-a-time view) -->
    <div class="section-buttons mb-4">
      <v-btn-toggle v-model="activeSection" mandatory divided>
        <v-btn :value="'ageService'" variant="flat">📊 Age & Service</v-btn>
        <v-btn :value="'headcount'"  variant="flat">👷 Headcount by Type</v-btn>
        <v-btn :value="'charts'"     variant="flat">📈 Direct/Indirect + Budget</v-btn>
        <v-btn :value="'resign'"     variant="flat">📉 Resign Reasons</v-btn>
        <v-btn :value="'yearlyResign'" variant="flat">🗓️ Yearly Resign</v-btn>
        <v-btn :value="'inOut'"      variant="flat">🔄 Direct Labor In & Out</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Content -->
    <v-window v-model="activeSection" class="rounded-xl elevation-1">
      <!-- Age & Year of Service -->
      <v-window-item value="ageService">
        <v-card class="pa-4">
          <v-row dense class="chart-section">
            <v-col cols="12" sm="6" class="pa-2 dashboard-card card-avg-age">
              <AvgAgeCard />
            </v-col>

            <v-col cols="12" sm="6" class="pa-2 dashboard-card card-avg-service">
              <YearOfService />
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- Headcount by Position -->
      <v-window-item value="headcount">
        <v-card class="pa-4">
          <v-row dense class="headcount-section">
            <v-col cols="12" class="dashboard-card">
              <TypeOfPosition />
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- Direct/Indirect Charts + Budget Summary -->
      <v-window-item value="charts">
        <v-card class="pa-4">
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
        </v-card>
      </v-window-item>

      <!-- Resign Reasons -->
      <v-window-item value="resign">
        <v-card class="pa-4">
          <v-row dense class="chart-section">
            <v-col cols="12" class="dashboard-card card-summary">
              <ReasonResignDirectTable :year="selectedYear" />
            </v-col>
            <v-col cols="12" class="dashboard-card card-summary">
              <ReasonResignDirectLabor :year="selectedYear" />
            </v-col>
            <v-col cols="12" class="dashboard-card card-summary">
              <ReasonResignIndirectTable :year="selectedYear" />
            </v-col>
            <v-col cols="12" class="dashboard-card card-summary">
              <ReasonResignIndirectLabor :year="selectedYear" />
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- Yearly Resign -->
      <v-window-item value="yearlyResign">
        <v-card class="pa-4">
          <v-row dense>
            <v-col cols="12" class="dashboard-card card-summary">
              <PeroidOfDirectLaborResignByYear :year="selectedYear" />
            </v-col>
            <v-col cols="12" class="dashboard-card card-summary">
              <PeriodOfDirectLaborChartResignByYear :year="selectedYear" />
            </v-col>
            <v-col cols="12" class="dashboard-card card-summary">
              <PeriodOfIndirectLaborResignByYear :year="selectedYear" />
            </v-col>
            <v-col cols="12" class="dashboard-card card-summary">
              <PeriodOfIndirectLaborChartResignByYear :year="selectedYear" />
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- Direct Labor In & Out -->
      <v-window-item value="inOut">
        <v-card class="pa-4">
          <v-col cols="12" class="dashboard-card card-summary">
            <DirectLaborInAndOut :year="selectedYear" />
          </v-col>
        </v-card>
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script>
import TypeOfPosition from './excome/TypeOfPosition.vue'
import SummaryBudgetTable from './excome/SummaryBudgetTable.vue'
import DirectLaborChart from './excome/DirectLaborChart.vue'
import IndirectLaborChart from './excome/IndirectLaborChart.vue'
import AvgAgeCard from './excome/AvgAgeCard.vue'
import YearOfService from './excome/YearOfService.vue'
import ReasonResignDirectTable from './excome/ReasonResignDirectTable.vue'
import ReasonResignIndirectTable from './excome/ReasonResignIndirectTable.vue'
import ReasonResignDirectLabor from './excome/ReasonResignDirectLabor.vue'
import ReasonResignIndirectLabor from './excome/ReasonResignIndirectLabor.vue'
import PeroidOfDirectLaborResignByYear from './excome/PeroidOfDirectLaborResignByYear.vue'
import PeriodOfIndirectLaborResignByYear from './excome/PeriodOfIndirectLaborResignByYear.vue'
import PeriodOfDirectLaborChartResignByYear from './excome/PeriodOfDirectLaborChartResignByYear.vue'
import PeriodOfIndirectLaborChartResignByYear from './excome/PeriodOfIndirectLaborChartResignByYear.vue'
import DirectLaborInAndOut from './excome/DirectLaborInAndOut.vue'

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
    PeroidOfDirectLaborResignByYear,
    PeriodOfIndirectLaborResignByYear,
    PeriodOfDirectLaborChartResignByYear,
    PeriodOfIndirectLaborChartResignByYear,
    DirectLaborInAndOut
  },
  data() {
    const currentYear = new Date().getFullYear()
    return {
      selectedYear: currentYear,
      yearOptions: Array.from({ length: 6 }, (_, i) => currentYear - i),
      // Default visible section
      activeSection: 'ageService'
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  background-color: #f5f7fa;
  min-height: 100vh;
  padding: 1.5rem;
}

/* Button row */
.section-buttons {
  display: flex;
  overflow-x: auto;
}
.section-buttons .v-btn {
  text-transform: none;
  font-weight: 600;
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

/* Spacing */
.headcount-section     { margin-bottom: 2rem; }
.chart-section         { margin-bottom: 2rem; }

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
