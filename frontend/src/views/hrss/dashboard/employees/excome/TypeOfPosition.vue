<template>
  <v-container fluid class="pa-6">
    <v-card class="pa-4 elevation-1">
      <v-row class="mb-4" align="center">
        <v-col cols="12" sm="4" md="3">
          <v-select
            v-model="selectedYear"
            :items="yearOptions"
            label="Select Year"
            density="compact"
            variant="outlined"
            @update:modelValue="fetchData"
          />
        </v-col>
      </v-row>

      <v-table fixed-header class="table-scroll-x">
        <thead>
          <tr>
            <th class="text-left">Type of Employee</th>
            <th v-for="m in monthNames" :key="m" class="text-center">{{ m }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="type in employeeTypes" :key="type.key">
            <td><strong>{{ type.label }}</strong></td>
            <td v-for="month in 12" :key="month" class="text-center">
              {{ snapshotData[type.key][month - 1] || 0 }}
            </td>
          </tr>
          <!-- Grand Total -->
          <tr class="bg-grey-lighten-3 font-weight-bold">
            <td>Grand Total</td>
            <td v-for="month in 12" :key="'total-' + month" class="text-center">
              {{ grandTotals[month - 1] || 0 }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const selectedYear = ref(dayjs().year())
const yearOptions = Array.from({ length: 10 }, (_, i) => dayjs().year() - i)

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const employeeTypes = [
  { key: 'directLabor', label: 'Direct' },
  { key: 'indirectLabor', label: 'Indirect' },
  { key: 'marketing', label: 'Marketing' }
]

const snapshotData = ref({
  directLabor: Array(12).fill(0),
  indirectLabor: Array(12).fill(0),
  marketing: Array(12).fill(0)
})

const grandTotals = computed(() => {
  const totals = Array(12).fill(0)
  for (let i = 0; i < 12; i++) {
    totals[i] =
      (snapshotData.value.directLabor[i] || 0) +
      (snapshotData.value.indirectLabor[i] || 0) +
      (snapshotData.value.marketing[i] || 0)
  }
  return totals
})

const fetchData = async () => {
  try {
    const res = await axios.get('/excome/monthly-snapshots', {
      params: { year: selectedYear.value }
    });

    console.log('[FULL RESPONSE]', res);
    console.log('[FETCHED DATA]', res.data);

    const snapshots = Array.isArray(res.data.snapshots) ? res.data.snapshots : [];

    if (!snapshots.length) {
      console.warn('⚠ No snapshot data found for this year');
    }

    const empty = Array(12).fill(0);
    snapshotData.value = {
      directLabor: [...empty],
      indirectLabor: [...empty],
      marketing: [...empty]
    };

    for (const snap of snapshots) {
      const m = snap.month;
      snapshotData.value.directLabor[m] = snap.directLabor || 0;
      snapshotData.value.indirectLabor[m] = snap.indirectLabor || 0;
      snapshotData.value.marketing[m] = snap.marketing || 0;
    }
  } catch (err) {
    console.error('❌ Failed to fetch snapshots:', err);
  }
};


onMounted(fetchData)
</script>

<style scoped>
.table-scroll-x {
  overflow-x: auto;
}
</style>
