<template>
  <v-card class="rounded-2xl elevation-1">
    <!-- Toolbar -->
    <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl">
      <v-toolbar-title>Daily Attendance Report (by Position)</v-toolbar-title>
      <template #append>
        <v-btn variant="flat" color="white" :loading="loading" @click="loadData">
          <v-icon start>mdi-refresh</v-icon> Refresh
        </v-btn>
      </template>
    </v-toolbar>

    <v-container fluid class="pa-4">
      <!-- Filters -->
      <v-row class="mb-2">
        <v-col cols="12" sm="2">
          <v-text-field
            v-model.number="year"
            label="Year"
            type="number"
            min="2000"
            :max="2100"
            variant="outlined"
            density="compact"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-select
            v-model.number="month"
            :items="monthOptions"
            item-title="label"
            item-value="value"
            label="Month"
            variant="outlined"
            density="compact"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-btn color="primary" class="w-100" @click="loadData" :loading="loading">
            <v-icon start>mdi-magnify</v-icon> Generate
          </v-btn>
        </v-col>
      </v-row>

      <!-- Table -->
      <v-data-table
        :headers="headers"
        :items="rows"
        fixed-header
        density="compact"
        height="70vh"
        class="text-caption"
      >
        <template #item.position="{ item }">
          <strong>{{ item.position }}</strong>
        </template>

        <template v-for="day in days" #[`item.${day}`]="{ item }" :key="day">
          <span :style="getCellStyle(item[day])">
            {{ item[day] !== undefined ? item[day] + '%' : '-' }}
          </span>
        </template>
      </v-data-table>
    </v-container>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import dayjs from '@/plugins/dayjs'

/* ───────── Filters ───────── */
const now = dayjs()
const year = ref(Number(now.format('YYYY')))
const month = ref(Number(now.format('MM')))

/* ───────── Data ───────── */
const days = ref([])
const rows = ref([])
const loading = ref(false)

/* ───────── Month Options ───────── */
const monthOptions = [
  { label: 'Jan', value: 1 },
  { label: 'Feb', value: 2 },
  { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 },
  { label: 'May', value: 5 },
  { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 },
  { label: 'Aug', value: 8 },
  { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 },
  { label: 'Nov', value: 11 },
  { label: 'Dec', value: 12 },
]

/* ───────── Table Headers ───────── */
const headers = computed(() => [
  { title: 'Position', key: 'position', align: 'start', fixed: true },
  ...days.value.map((d) => ({
    title: d.toString(),
    key: d.toString(),
    align: 'center',
  })),
])

/* ───────── Fetch Data ───────── */
async function loadData() {
  loading.value = true
  try {
    const { data } = await axios.get('/hrss/attendance/report/daily', {
      params: { year: year.value, month: month.value, mode: 'position' },
    })

    days.value = data.days || []
    rows.value = (data.rows || []).map((r) => ({
      position: r.department || r.position || 'Unknown',
      ...r,
    }))
  } catch (err) {
    console.error('❌ loadData failed', err)
    days.value = []
    rows.value = []
  } finally {
    loading.value = false
  }
}

/* ───────── Cell Style ───────── */
function getCellStyle(value) {
  if (value >= 90) return 'background:#4CAF50;color:white;padding:2px 6px;border-radius:4px;'
  if (value >= 70) return 'background:#FFC107;color:black;padding:2px 6px;border-radius:4px;'
  if (value > 0) return 'background:#F44336;color:white;padding:2px 6px;border-radius:4px;'
  return 'color:#777'
}

/* ───────── Lifecycle ───────── */
onMounted(loadData)
</script>

<style scoped>
.v-data-table {
  font-size: 12px;
}
.v-data-table th {
  font-weight: 600;
  background-color: #f4f6fa;
}
</style>
