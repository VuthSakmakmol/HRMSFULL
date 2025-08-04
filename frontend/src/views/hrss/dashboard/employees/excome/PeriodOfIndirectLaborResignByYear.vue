<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      🧾 Period of Indirect Labor Resignation Summary ({{ selectedYear }})
    </h3>

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

    <v-table class="elevation-1 table-scroll-x">
      <thead class="bg-teal-darken-2 text-white">
        <tr>
          <th class="text-left">Group of Indirect</th>
          <th class="text-right">%</th>
          <th v-for="month in months" :key="month" class="text-right">
            {{ month }}
          </th>
          <th class="text-right">Total</th>
          <th class="text-right">%</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table" :key="row.group">
          <td class="text-left">{{ row.group }}</td>
          <td class="text-right">{{ row.percent }}</td>
          <td v-for="month in months" :key="month" class="text-right">
            {{ row[month] || 0 }}
          </td>
          <td class="text-right">{{ row.total }}</td>
          <td class="text-right">{{ row.percent }}</td>
        </tr>
        <tr class="font-weight-bold bg-teal-lighten-5">
          <td class="text-left">{{ totalRow.group }}</td>
          <td class="text-right">100%</td>
          <td v-for="month in months" :key="month" class="text-right">
            {{ totalRow[month] || 0 }}
          </td>
          <td class="text-right">{{ totalRow.total }}</td>
          <td class="text-right">100%</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from '@/utils/axios'

const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const table = ref([])
const totalRow = ref({ group: 'Total' })

const fetchData = async () => {
  try {
    const res = await axios.get('/hrss/excome/period-of-indirect-resign', {
      params: { year: selectedYear.value }
    })

    table.value = res.data?.table || []
    totalRow.value = res.data?.total || { group: 'Total' }
  } catch (err) {
    console.error('❌ Failed to fetch indirect resignation period data:', err)
  }
}

onMounted(fetchData)
watch(selectedYear, fetchData)
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
}
th, td {
  white-space: nowrap;
  padding: 6px 12px;
}
thead th {
  font-weight: 600;
}
</style>
