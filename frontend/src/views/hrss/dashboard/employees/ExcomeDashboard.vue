<template>
  <v-container fluid>
    <!-- Month selector -->
    <v-row class="mb-6" justify="start">
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
    <v-row dense>
      <v-col cols="12" sm="4" md="4">
        <TypeOfPosition title="Direct Labor" :count="counts.directLabor" />
      </v-col>
      <v-col cols="12" sm="4" md="4">
        <TypeOfPosition title="Marketing" :count="counts.marketing" />
      </v-col>
      <v-col cols="12" sm="4" md="4">
        <TypeOfPosition title="Indirect Labor" :count="counts.indirectLabor" />
      </v-col>
    </v-row>

    <!-- Summary Budget Table -->
    <v-row class="mt-8">
      <v-col cols="12">
        <SummaryBudgetTable />
      </v-col> 
    </v-row>
  </v-container>
</template>

<script>
import axios from '@/utils/axios'
// assumes this file sits alongside TypeOfPosition.vue
import TypeOfPosition from './excome/TypeOfPosition.vue'
import SummaryBudgetTable from './excome/SummaryBudgetTable.vue'


export default {
  name: 'ExcomeDashboard',
    components: {
    TypeOfPosition,
    SummaryBudgetTable
  },
  data() {
    return {
      // default to current month in YYYY-MM format
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
        // Adjust this URL if you mounted excomeRoutes under a different prefix
        const res = await axios.get('/excome/employee-count', {
          params: { month: this.selectedMonth }
        })
        const counts = res.data?.counts
        if (counts) {
          this.counts = counts
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
.v-text-field {
  max-width: 200px;
}
</style>
