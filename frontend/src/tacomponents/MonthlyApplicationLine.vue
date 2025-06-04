<template>
  <v-card class="pa-4" elevation="2">
    <v-row align-center="center" justify="space-between">
      <v-col cols="auto">
        <h3 class="text-h6">Number of Applications by Month</h3>
      </v-col>
      <v-col cols="auto">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 120px"
        />
      </v-col>
    </v-row>

    <!-- ✅ Put it right here -->
    <apexchart
      v-if="chartSeries[0].data.length > 0"
      type="line"
      height="250"
      :options="chartOptions"
      :series="chartSeries"
    />
  </v-card>
</template>


<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

// State
const selectedYear = ref(new Date().getFullYear())
const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const chartData = ref({ labels: [], counts: [] })
const loading = ref(false)

// Company from localStorage
const userCompany = ref(localStorage.getItem('company'))

// Hardcoded type/subType for now (you can pass as props if dynamic)
const type = ref('White Collar')
const subType = ref(null)

const chartOptions = ref({
  chart: {
    id: 'monthly-applications',
    toolbar: { show: false }
  },
  xaxis: {
    categories: chartData.value.labels
  },
  yaxis: {
    title: {
      text: 'Applications'
    }
  },
  colors: ['#3f51b5']
})

const chartSeries = ref([
  {
    name: 'Applications',
    data: chartData.value.counts
  }
])

const fetchMonthlyChart = async () => {
  loading.value = true
  try {
    const from = `${selectedYear.value}-01-01`
    const to = `${selectedYear.value}-12-31`

    const res = await axios.post('/dashboard/stats', {
      type: type.value,
      subType: subType.value,
      recruiter: null,
      departmentId: null,
      from,
      to,
      year: selectedYear.value,
      company: userCompany.value
    })

    chartData.value = res.data.monthly || { labels: [], counts: [] }

    // Update chart
    chartOptions.value.xaxis.categories = chartData.value.labels
    chartSeries.value[0].data = chartData.value.counts
  } catch (err) {
    console.error('Monthly chart fetch error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchMonthlyChart)
watch(selectedYear, fetchMonthlyChart)
</script>
