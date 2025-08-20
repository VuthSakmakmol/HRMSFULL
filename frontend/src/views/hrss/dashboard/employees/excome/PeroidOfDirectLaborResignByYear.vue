<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      Period of Direct Labor Resignation Summary ({{ year }})
    </h3>

    <v-progress-linear
      v-if="isLoading"
      height="2"
      indeterminate
      class="mb-2"
    />

    <v-table class="elevation-1 table-scroll-x">
      <thead class="bg-blue-darken-2 text-white">
        <tr>
          <th class="text-left">Group of Sewer</th>
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
            {{ row[month] ?? 0 }}
          </td>
          <td class="text-right">{{ row.total }}</td>
          <td class="text-right">{{ row.percent }}</td>
        </tr>
        <tr class="font-weight-bold bg-blue-lighten-5">
          <td class="text-left">{{ totalRow.group }}</td>
          <td class="text-right">100%</td>
          <td v-for="month in months" :key="month" class="text-right">
            {{ totalRow[month] ?? 0 }}
          </td>
          <td class="text-right">{{ totalRow.total }}</td>
          <td class="text-right">100%</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from '@/utils/axios'

// ✅ receive global year from parent (ExcomeDashboard.vue)
const { year } = defineProps({
  year: { type: Number, required: true }
})

const isLoading = ref(false)

const months = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
]

const table = ref([])
const totalRow = ref({ group: 'Total' })

async function fetchData() {
  try {
    isLoading.value = true
    const res = await axios.get('/hrss/excome/period-of-direct-resign', {
      params: { year }
    })
    table.value = res.data?.table || []
    totalRow.value = res.data?.total || { group: 'Total' }
  } catch (err) {
    console.error('❌ Failed to fetch resignation duration data:', err)
    table.value = []
    totalRow.value = { group: 'Total' }
  } finally {
    isLoading.value = false
  }
}

// 🔁 load now and whenever global year changes
watch(() => year, fetchData, { immediate: true })
</script>

<style scoped>
.table-scroll-x { overflow-x: auto; }
th, td { white-space: nowrap; padding: 6px 12px; }
thead th { font-weight: 600; }
</style>
