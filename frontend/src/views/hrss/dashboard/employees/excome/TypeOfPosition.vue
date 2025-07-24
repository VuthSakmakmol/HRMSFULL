<template>
  <v-card class="pa-4">
    <v-row class="mb-4" align="center" justify="space-between">
      <v-col cols="12" sm="6">
        <h3 class="text-h6 font-weight-bold">📊 Monthly Headcount by Position</h3>
      </v-col>
      <v-col cols="12" sm="3">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Select Year"
          dense
          variant="outlined"
          @update:modelValue="fetchSnapshots"
        />
      </v-col>
    </v-row>

    <v-table fixed-header class="table-scroll-x elevation-1">
      <thead>
        <tr>
          <th class="text-left">Type</th>
          <th v-for="month in months" :key="month" class="text-left">{{ month }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="type in positionTypes" :key="type">
          <td>{{ type }}</td>
          <td v-for="month in months" :key="month">
            {{ displayData[type][month] }}
          </td>
        </tr>
        <tr class="font-weight-bold">
          <td>Total</td>
          <td v-for="month in months" :key="month">
            {{
              positionTypes.reduce((sum, type) => sum + displayData[type][month], 0)
            }}
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import axios from '@/utils/axios'
import { ref, reactive, onMounted } from 'vue'

// Month labels and structure
const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]
const positionTypes = ['Direct Labor', 'Marketing', 'Indirect Labor']

// Default empty data structure
const emptyData = () => {
  const obj = {}
  positionTypes.forEach(type => {
    obj[type] = {}
    months.forEach(month => {
      obj[type][month] = 0
    })
  })
  return obj
}

const displayData = reactive(emptyData())

const selectedYear = ref(new Date().getFullYear())
const yearOptions = Array.from({ length: 6 }, (_, i) => 2023 + i)

const fetchSnapshots = async () => {
  try {
    const res = await axios.get('/hrss/excome/employee-snapshots', {
      params: { year: selectedYear.value }
    })

    const isHTML = typeof res.data === 'string' && res.data.startsWith('<!DOCTYPE')
    if (isHTML) {
      console.warn('⚠️ API returned HTML instead of JSON')
      return
    }

    const raw = res.data?.snapshots || []
    const formatted = emptyData()

    raw.forEach(item => {
      const monthName = months[item.month]
      formatted['Direct Labor'][monthName] = item.directLabor || 0
      formatted['Marketing'][monthName] = item.marketing || 0
      formatted['Indirect Labor'][monthName] = item.indirectLabor || 0
    })

    positionTypes.forEach(type => {
      months.forEach(month => {
        displayData[type][month] = formatted[type][month]
      })
    })
  } catch (err) {
    console.error('❌ Failed to fetch snapshot data:', err)
  }
}


onMounted(fetchSnapshots)
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
}
</style>
