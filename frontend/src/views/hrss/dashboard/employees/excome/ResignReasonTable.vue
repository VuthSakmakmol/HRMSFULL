<template>
  <v-card class="pa-4">
    <h3 class="text-h6 font-weight-bold mb-4">
      📉 Monthly Resign Reason Summary ({{ year }})
    </h3>

    <v-table fixed-header class="table-scroll-x elevation-1">
      <thead>
        <tr>
          <th>Reason</th>
          <th v-for="month in months" :key="month">{{ month }}</th>
          <th>Total</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in summary" :key="row.reason">
          <td>{{ row.reason }}</td>
          <td v-for="month in months" :key="month">{{ row[month] || 0 }}</td>
          <td>{{ row.total }}</td>
          <td>{{ row.percent }}</td>
        </tr>
        <tr v-if="summary.length === 0">
          <td colspan="15" class="text-center text-grey">No resign data found for {{ year }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({
  year: {
    type: Number,
    required: true
  }
})

const summary = ref([])
const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const fetchData = async () => {
  try {
    const res = await axios.get(`/hrss/excome/resign-reason-summary?year=${props.year}`)

    // Defensive: in case backend fails and returns HTML
    if (typeof res.data === 'string' && res.data.startsWith('<!DOCTYPE')) {
      console.warn('⚠️ Backend returned HTML instead of JSON — route may be incorrect')
      return
    }

    summary.value = res.data?.table || []
  } catch (err) {
    console.error('❌ Failed to fetch resign reason summary:', err)
  }
}

onMounted(fetchData)
watch(() => props.year, fetchData)
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
}
th, td {
  white-space: nowrap;
  text-align: center;
}
td:first-child {
  text-align: left;
}
</style>
