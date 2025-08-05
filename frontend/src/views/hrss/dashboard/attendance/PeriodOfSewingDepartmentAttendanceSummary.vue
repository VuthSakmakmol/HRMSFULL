<template>
  <v-card class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-4">
      🧾 Period of Sewing Department Attendance Summary ({{ selectedYear }}-{{ String(selectedMonth).padStart(2, '0') }})
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
      <v-col cols="12" sm="4">
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          label="Select Month"
          variant="outlined"
          density="comfortable"
        />
      </v-col>
    </v-row>

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
        <tr v-if="sewingData">
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
        <tr v-else>
          <td colspan="12" class="text-center text-grey">No data available</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

const yearOptions = Array.from({ length: 6 }, (_, i) => 2020 + i)
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

const sewingData = ref(null)

const fetchData = async () => {
  try {
    const res = await axios.get(
      `/hrss/attendance-dashboard/attendance/department-summary`,
      {
        params: {
          year: selectedYear.value,
          month: selectedMonth.value,
        },
      }
    )

    // Ensure it's an array
    const all = Array.isArray(res.data) ? res.data : []

    sewingData.value = all.find((d) => d.Department === 'Sewing') || null
  } catch (err) {
    console.error('❌ Error fetching summary:', err.message)
    sewingData.value = null
  }
}


onMounted(fetchData)
watch([selectedYear, selectedMonth], fetchData)
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
  display: block;
  white-space: nowrap;
}
</style>
