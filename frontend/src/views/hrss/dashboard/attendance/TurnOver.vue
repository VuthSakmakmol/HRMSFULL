<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      🧾 Direct Labor Turnover Rate ({{ selectedYear }})
    </h3>

    <!-- 🎯 Update Target Button -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-btn color="red-darken-1" @click="showTargetDialog = true" variant="outlined">
          🎯 Update Target ({{ currentTarget }}%)
        </v-btn>
      </v-col>
    </v-row>

    <!-- 📝 Target Update Dialog -->
    <v-dialog v-model="showTargetDialog" width="400">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">Update Turnover Target (%)</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newTarget"
            label="Target %"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text="Cancel" @click="showTargetDialog = false" />
          <v-btn color="primary" text="Save" @click="updateTarget" />
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 📅 Year Selector -->
    <v-row class="mb-4">
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

    <!-- 📊 Turnover Chart -->
    <VueApexCharts
      type="bar"
      height="400"
      :options="chartOptions"
      :series="chartSeries"
    />

    <!-- 📋 Transposed Summary Table -->
    <v-table class="mt-6 table-scroll-x">
      <thead>
        <tr>
          <th>Category</th>
          <th v-for="item in summary" :key="item.month">
            {{ item.month }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>This Year Joined</td>
          <td v-for="item in summary" :key="'ty-joined-' + item.month">{{ item.thisYearJoined }}</td>
        </tr>
        <tr>
          <td>This Year Left</td>
          <td v-for="item in summary" :key="'ty-left-' + item.month">{{ item.thisYearExits }}</td>
        </tr>
        <tr>
          <td>This Year Turnover (%)</td>
          <td v-for="item in summary" :key="'ty-rate-' + item.month">{{ item.thisYearRate }}%</td>
        </tr>
        <tr>
          <td>Last Year Joined</td>
          <td v-for="item in summary" :key="'ly-joined-' + item.month">{{ item.lastYearJoined }}</td>
        </tr>
        <tr>
          <td>Last Year Left</td>
          <td v-for="item in summary" :key="'ly-left-' + item.month">{{ item.lastYearExits }}</td>
        </tr>
        <tr>
          <td>Last Year Turnover (%)</td>
          <td v-for="item in summary" :key="'ly-rate-' + item.month">{{ item.lastYearRate }}%</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import VueApexCharts from 'vue3-apexcharts'

const selectedYear = ref(new Date().getFullYear())
const yearOptions = Array.from({ length: 5 }, (_, i) => selectedYear.value - i)

const summary = ref([])
const chartSeries = ref([])
const chartOptions = ref({})
const currentTarget = ref(0)
const newTarget = ref(0)
const showTargetDialog = ref(false)

const fetchData = async () => {
  try {
    const { data } = await axios.get(`/hrss/attendance-dashboard/turnover/direct-labor?year=${selectedYear.value}`)
    summary.value = data.data
    currentTarget.value = data.target
    newTarget.value = data.target

    chartSeries.value = [
      { name: 'This Year (%)', type: 'column', data: summary.value.map(m => m.thisYearRate) },
      { name: 'Last Year (%)', type: 'column', data: summary.value.map(m => m.lastYearRate) },
      { name: 'Target (%)', type: 'line', data: Array(12).fill(data.target) }
    ]

    chartOptions.value = {
      chart: { type: 'line', stacked: false },
      xaxis: { categories: summary.value.map(m => m.month) },
      yaxis: { title: { text: 'Turnover %' } },
      stroke: { width: [2, 2, 2], dashArray: [0, 0, 6] },
      colors: ['#1E88E5', '#43A047', '#e53935'],
      legend: { position: 'top' },
      dataLabels: { enabled: false }
    }
  } catch (err) {
    console.error(err)
  }
}

const updateTarget = async () => {
  try {
    await axios.put('/hrss/attendance-dashboard/turnover/target', {
      year: selectedYear.value,
      type: 'TurnoverRate',
      value: parseFloat(newTarget.value)
    })
    currentTarget.value = newTarget.value
    showTargetDialog.value = false
    await fetchData()
  } catch (err) {
    console.error(err)
  }
}

onMounted(fetchData)
</script>
