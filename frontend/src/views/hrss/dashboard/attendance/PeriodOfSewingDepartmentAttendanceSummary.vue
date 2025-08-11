<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      Sewing(Blue) Department Attendance Summary ({{ year }}-{{ String(month).padStart(2, '0') }})
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
        <tr>
          <td>{{ sewingData.Department }}</td>
          <td>{{ sewingData['Annual Leave'] }}</td>
          <td>{{ sewingData['Maternity Leave'] }}</td>
          <td>{{ sewingData['Sick Leave'] }}</td>
          <td>{{ sewingData['Unpaid Leave'] }}</td>
          <td>{{ sewingData['Absent'] }}</td>
          <td>{{ sewingData['Grand Total'] }}</td>
          <td>{{ sewingData['Number of Employees'] }}</td>
          <td>{{ sewingData['Working day'] }}</td>
          <td class="text-error">{{ sewingData['%Absent'] }}</td>
          <td class="text-error">{{ sewingData['% AL'] }}</td>
          <td class="text-error">{{ sewingData['Exclude AL'] }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true }
})

// Default object so table always shows
const defaultData = {
  Department: 'Sewing(Blue)',
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
}

const sewingData = ref({ ...defaultData })

const fetchData = async () => {
  try {
    const res = await axios.get('/hrss/attendance-dashboard/attendance/department-summary', {
      params: {
        year: props.year,
        month: props.month,
        _t: Date.now()
      }
    })
    const all = Array.isArray(res.data) ? res.data : []
    sewingData.value = all.find((d) => d.Department === 'Sewing(Blue)') || { ...defaultData }
  } catch (err) {
    console.error('❌ Sewing summary error:', err.message)
    sewingData.value = { ...defaultData }
  }
}

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
