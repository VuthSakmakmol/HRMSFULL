<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      🏢 Indirect & Merchandising Attendance Summary ({{ year }}-{{ formattedMonth }})
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
          v-for="row in indirectRows"
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
        <tr v-if="indirectRows.length === 0">
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
  year: Number,
  month: Number
})

const indirectRows = ref([])

const formattedMonth = computed(() => String(props.month).padStart(2, '0'))

const fetchData = async () => {
  try {
    const res = await axios.get('/hrss/attendance-dashboard/attendance/indirect-summary', {
      params: {
        year: props.year,
        month: props.month,
        _t: Date.now()
      }
    })
    indirectRows.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('❌ Indirect summary error:', err.message)
    indirectRows.value = []
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
