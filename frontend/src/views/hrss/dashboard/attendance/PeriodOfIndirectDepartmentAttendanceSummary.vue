<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      Indirect & Merchandising Attendance Summary ({{ year }}-{{ formattedMonth }})
    </h3>

    <v-table fixed-header class="elevation-1 table-scroll-x">
      <thead>
        <tr>
          <th>Department</th>
          <th>Annual Leave</th>
          <th>Maternity Leave</th>
          <th>Sick Leave</th>
          <th>Unpaid Leave</th>
          <th>Absent</th>
          <th>Grand Total</th>
          <th>Number of Employees</th>
          <th>Working Day</th>
          <th>%Absent</th>
          <th>% AL</th>
          <th>Exclude AL</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in filledRows"
          :key="row.Department"
        >
          <td>{{ row.Department }}</td>
          <td>{{ row['Annual Leave'] }}</td>
          <td>{{ row['Maternity Leave'] }}</td>
          <td>{{ row['Sick Leave'] }}</td>
          <td>{{ row['Unpaid Leave'] }}</td>
          <td>{{ row['Absent'] }}</td>
          <td>{{ row['Grand Total'] }}</td>
          <td>{{ row['Number of Employees'] }}</td>
          <td>{{ row['Working day'] }}</td>
          <td class="text-error">{{ row['%Absent'] }}</td>
          <td class="text-error">{{ row['% AL'] }}</td>
          <td class="text-error">{{ row['Exclude AL'] }}</td>
        </tr>
        <tr v-if="!filledRows.length">
          <td colspan="12" class="text-center text-grey">No data available</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  // Optional: provide your full list of departments to always display
  // (excluding Sewing(Blue) – the component will also filter it out)
  departments: { type: Array, default: () => [] }
})

const rawRows = ref([])

const formattedMonth = computed(() => String(props.month).padStart(2, '0'))

const defaultRow = (dept) => ({
  Department: dept,
  'Annual Leave': 0,
  'Maternity Leave': 0,
  'Sick Leave': 0,
  'Unpaid Leave': 0,
  'Absent': 0,
  'Grand Total': 0,
  'Number of Employees': 0,
  'Working day': 0,
  '%Absent': '0.00%',
  '% AL': '0.00%',
  'Exclude AL': '0.00%'
})

const fetchData = async () => {
  try {
    const res = await axios.get('/hrss/attendance-dashboard/attendance/indirect-summary', {
      params: {
        year: props.year,
        month: props.month,
        _t: Date.now()
      }
    })
    const list = Array.isArray(res.data) ? res.data : []
    // Backend *should* already exclude Sewing(Blue). We also guard here.
    rawRows.value = list.filter(r => r?.Department !== 'Sewing(Blue)')
  } catch (err) {
    console.error('❌ Indirect summary error:', err.message)
    rawRows.value = []
  }
}

// Merge API rows with the full department list so all show up (zeros if missing)
const filledRows = computed(() => {
  // Set of departments to display:
  //   1) use props.departments if provided
  //   2) otherwise derive from API
  const apiDepts = new Set(rawRows.value.map(r => r.Department))
  const baseDepts = (props.departments.length
    ? props.departments
    : Array.from(apiDepts)
  ).filter(d => d && d !== 'Sewing(Blue)') // ensure Sewing(Blue) hidden here too

  // Map API rows by department
  const map = new Map(rawRows.value.map(r => [r.Department, r]))

  // Build final list with defaults for missing departments
  return baseDepts.map(dept => map.get(dept) || defaultRow(dept))
})

onMounted(fetchData)
watch(() => [props.year, props.month], fetchData, { immediate: true })
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
  display: block;
  white-space: nowrap;
}
</style>
