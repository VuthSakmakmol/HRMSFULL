<template>
  <v-card class="mt-4 mx-4" elevation="2">
    <v-card-title>
      <v-icon class="mr-2" color="primary">mdi-chart-bar</v-icon>
      <span class="text-h6 font-weight-bold">Monthly Manpower</span>
    </v-card-title>

    <v-table class="ma-4" density="compact">
      <thead>
        <tr>
          <th class="text-left">Category</th>
          <th class="text-left">Department</th>
          <th class="text-right">April</th>
          <th class="text-right">May</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in manpowerData" :key="index">
          <td :style="row.category === 'RD& MKT' ? 'color: red; font-weight: bold' : ''">
            {{ row.category }}
          </td>
          <td :style="row.category === 'RD& MKT' ? 'color: red' : ''">
            {{ row.department }}
          </td>
          <td class="text-right">{{ row.April }}</td>
          <td class="text-right">{{ row.May }}</td>
        </tr>

        <tr class="font-weight-bold">
          <td colspan="2" class="text-right">Grand Total</td>
          <td class="text-right">{{ total.April }}</td>
          <td class="text-right">{{ total.May }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const manpowerData = ref([])
const total = ref({ April: 0, May: 0 })

const fetchManpower = async () => {
  try {
    const res = await axios.get('/api/dashboard/monthly-manpower')

    const data = Array.isArray(res.data) ? res.data : []

    manpowerData.value = data

    total.value = data.reduce(
      (acc, row) => {
        acc.April += Number(row.April) || 0
        acc.May += Number(row.May) || 0
        return acc
      },
      { April: 0, May: 0 }
    )
  } catch (err) {
    console.error('Failed to load manpower data', err)
  }
}

onMounted(fetchManpower)
</script>

<style scoped>
th,
td {
  font-size: 13px;
}
</style>
