<template>
  <v-container fluid class="dashboard-container">
    <!-- Month selector -->
    <v-row class="month-selector" justify="start">
      <v-col cols="12" sm="4" md="3">
        <v-text-field
          v-model="selectedMonth"
          label="Select month"
          type="month"
          @change="fetchCounts"
          dense
          outlined
        />
      </v-col>
    </v-row>

    <!-- Headcount cards -->
    <v-row dense class="headcount-section">
      <v-col cols="12" sm="4" md="4" class="dashboard-card card-direct">
        <TypeOfPosition title="Direct Labor" :count="counts.directLabor" />
      </v-col>
      <v-col cols="12" sm="4" md="4" class="dashboard-card card-marketing">
        <TypeOfPosition title="Marketing" :count="counts.marketing" />
      </v-col>
      <v-col cols="12" sm="4" md="4" class="dashboard-card card-indirect">
        <TypeOfPosition title="Indirect Labor" :count="counts.indirectLabor" />
      </v-col>
    </v-row>

    <!-- Avg Age card -->
    <v-row class="avg-age-section">
      <v-col cols="12" class="dashboard-card card-avg-age">
        <AvgAgeCard />
      </v-col>
    </v-row>

    <!-- Avg Years of Service cards -->
    <v-row class="avg-service-section">
      <v-col cols="12" class="dashboard-card card-avg-service">
        <YearOfService />
      </v-col>
    </v-row>

    <!-- Direct Labor Chart -->
    <v-row class="chart-section">
      <v-col cols="12" class="dashboard-card card-direct-chart">
        <DirectLaborChart />
      </v-col>
    </v-row>
    
    <!-- Indirect Labor Chart -->
    <v-row class="chart-section">
      <v-col cols="12" class="dashboard-card card-indirect-chart">
        <IndirectLaborChart />
      </v-col>
    </v-row>

    <!-- Summary Budget Table -->
    <v-row class="summary-table-section">
      <v-col cols="12" class="dashboard-card card-summary">
        <SummaryBudgetTable />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from '@/utils/axios'
import TypeOfPosition      from './excome/TypeOfPosition.vue'
import SummaryBudgetTable  from './excome/SummaryBudgetTable.vue'
import DirectLaborChart    from './excome/DirectLaborChart.vue'
import IndirectLaborChart  from './excome/IndirectLaborChart.vue'
import AvgAgeCard          from './excome/AvgAgeCard.vue'
import YearOfService from './excome/YearOfService.vue'



export default {
  name: 'ExcomeDashboard',
  components: {
    TypeOfPosition,
    SummaryBudgetTable,
    DirectLaborChart,
    IndirectLaborChart,
    AvgAgeCard,
    YearOfService,
  },
  data() {
    return {
      // default to current month in YYYY-MM format
      selectedMonth: this.formatMonth(new Date()),
      // headcount by type
      counts: {
        directLabor:   0,
        marketing:     0,
        indirectLabor: 0
      }
    }
  },
  methods: {
    // format JS Date → "YYYY-MM"
    formatMonth(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      return `${y}-${m}`
    },
    // fetch headcount totals
    async fetchCounts() {
      try {
        const res = await axios.get('/excome/employee-count', {
          params: { month: this.selectedMonth }
        })
        if (res.data?.counts) {
          this.counts = res.data.counts
        } else {
          console.warn('Excome API returned no counts:', res.data)
        }
      } catch (err) {
        console.error('Failed to load Excome headcount:', err)
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
.card-direct {
  border-top: 4px solid #3b82f6;       /* Blue */
  background-color: #eff6ff;
}
.card-marketing {
  border-top: 4px solid #10b981;       /* Green */
  background-color: #ecfdf5;
}
.card-indirect {
  border-top: 4px solid #f59e0b;       /* Amber */
  background-color: #fffbeb;
}
.card-avg-age {
  border-top: 4px solid #ec4899;       /* Pink */
  background-color: #fdf2f8;
}

/* Chart wrappers get same accent as their related cards */
.card-direct-chart {
  border-top: 4px solid #3b82f6;
  background-color: #eff6ff;
}
.card-indirect-chart {
  border-top: 4px solid #f59e0b;
  background-color: #fffbeb;
}

/* Summary table variant */
.card-summary {
  border-top: 4px solid #8b5cf6;       /* Violet */
  background-color: #f5f3ff;
}

/* Section spacing */
.headcount-section { margin-bottom: 2rem; }
.avg-age-section    { margin-bottom: 2rem; }
.chart-section      { margin-bottom: 2rem; }
.summary-table-section { margin-bottom: 2rem; }

/* Typography tweaks */
.dashboard-container .v-label,
.dashboard-container .v-field label {
  font-weight: 500;
  color: #374151;
}

.avg-service-section { margin-bottom: 2rem; }
.card-avg-service {
  border-top: 4px solid #6366f1;   /* Indigo */
  background-color: #eef2ff;
}


.dashboard-container .v-input__control {
  font-size: 0.95rem;
}
</style>
