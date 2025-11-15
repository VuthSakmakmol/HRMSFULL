<template>
  <v-card class="rounded-2xl elevation-1 overflow-hidden">
    <!-- Toolbar -->
    <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl">
      <v-toolbar-title class="text-white">
        <v-icon start>mdi-calendar-check</v-icon>
        Daily Attendance Report
      </v-toolbar-title>

      <template #append>
        <v-btn variant="text" color="white" :loading="loading" @click="loadData">
          <v-icon start>mdi-refresh</v-icon> Refresh
        </v-btn>
        <v-btn variant="text" color="white" @click="exportToExcel">
          <v-icon start>mdi-file-excel</v-icon> Export
        </v-btn>
      </template>
    </v-toolbar>

    <v-container fluid class="pa-4">
      <!-- Filters -->
      <v-row class="mb-3" align="center">
        <v-col cols="6" sm="2">
          <v-text-field
            v-model.number="year"
            label="Year"
            type="number"
            variant="outlined"
            density="compact"
          />
        </v-col>
        <v-col cols="6" sm="2">
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
        <v-col cols="12" sm="2" class="mb-5">
          <v-btn color="primary" block :loading="loading" @click="loadData">
            <v-icon start>mdi-magnify</v-icon> Generate
          </v-btn>
        </v-col>
      </v-row>

      <!-- Scrollable Table -->
      <div class="table-container">
        <table class="attendance-table">
          <thead>
            <tr>
              <th class="sticky-left header-left">Department / Metric</th>
              <th v-for="day in days" :key="day" class="sticky-top">
                {{ day }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in paginatedRows" :key="item.label">
              <td class="sticky-left" :class="{ summary: item.type === 'summary' }">
                {{ item.label }}
              </td>
              <td
                v-for="day in days"
                :key="day"
                v-html="formatStyledValue(item, day)"
              />
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Text Pagination -->
      <div class="text-pagination">
        <v-btn
          variant="text"
          :disabled="page === 1"
          @click="prevPage"
          class="text-btn"
        >
          ← Previous
        </v-btn>

        <span class="page-indicator">
          Page {{ page }} / {{ pageCount }}
        </span>

        <v-btn
          variant="text"
          :disabled="page === pageCount"
          @click="nextPage"
          class="text-btn"
        >
          Next →
        </v-btn>
      </div>
    </v-container>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from '@/utils/axios'
import dayjs from '@/plugins/dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

/* ---------- Filters ---------- */
const now = dayjs()
const year = ref(Number(now.format('YYYY')))
const month = ref(Number(now.format('MM')))
const loading = ref(false)

/* ---------- Data ---------- */
const days = ref([])
const summaryRows = ref([])
const departments = ref([])

/* ---------- Pagination ---------- */
const page = ref(1)
const rowsPerPage = ref(10) // ✅ show 10 rows per page

/* ---------- Month options ---------- */
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

/* ---------- Combined rows ---------- */
const combinedRows = computed(() => {
  const summary = summaryRows.value.map((r) => ({
    label: r.label,
    type: 'summary',
    ...r.data,
  }))

  const uniqueDepartments = []
  const seen = new Set()
  for (const r of departments.value) {
    if (!seen.has(r.department)) {
      seen.add(r.department)
      uniqueDepartments.push(r)
    }
  }

  const deps = uniqueDepartments.map((r) => ({
    label: r.department,
    type: 'department',
    ...r,
  }))

  return [...summary, ...deps]
})

/* ---------- Pagination ---------- */
const pageCount = computed(() =>
  Math.max(1, Math.ceil(combinedRows.value.length / rowsPerPage.value))
)
const paginatedRows = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value
  return combinedRows.value.slice(start, start + rowsPerPage.value)
})

function nextPage() {
  if (page.value < pageCount.value) page.value++
}
function prevPage() {
  if (page.value > 1) page.value--
}

watch([combinedRows, rowsPerPage], () => (page.value = 1))

/* ---------- Load Data ---------- */
async function loadData() {
  loading.value = true
  try {
    const { data } = await axios.get('/hrss/attendance/report/daily', {
      params: { year: year.value, month: month.value },
    })
    days.value = data.days || []
    summaryRows.value = data.summary || []
    departments.value = data.departments || []
    page.value = 1
  } catch (err) {
    console.error('❌ loadData error', err)
  } finally {
    loading.value = false
  }
}

/* ---------- Export to Excel ---------- */
function exportToExcel() {
  if (!combinedRows.value.length) {
    alert('No data to export')
    return
  }

  const header = ['Department / Metric', ...days.value]
  const rows = combinedRows.value.map((item) => {
    const row = [item.label]
    for (const d of days.value) {
      row.push(item[d] ?? '')
    }
    return row
  })

  const worksheetData = [header, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(worksheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

  const monthName = monthOptions.find(m => m.value === month.value)?.label || month.value
  const fileName = `Daily_Attendance_${year.value}_${monthName}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName)
}

/* ---------- Formatters ---------- */
function formatStyledValue(item, day) {
  const v = item[day] ?? 0
  const excludePercent = [
    'TOTAL EMPLOYEE',
    'FACE SCAN',
    'MATERNITY LEAVE',
    'ANNUAL LEAVE',
    'UNPAID LEAVE',
    'SICK LEAVE',
  ]
  const showPercent = !excludePercent.includes(item.label?.toUpperCase?.())
  const value = item.type === 'summary'
    ? (showPercent ? `${v}%` : v)
    : (showPercent ? v + '%' : v)
  const bg = getCellColor(item, v)
  return `<div style="min-width:40px;text-align:center;padding:4px 6px;border-radius:6px;${bg}">${value}</div>`
}

function getCellColor(item, v) {
  if (item.type === 'summary') {
    if (item.label === 'ABSENT RATE') {
      if (v >= 6) return 'background:#e53935;color:white;'
      if (v >= 4) return 'background:#ffb300;color:black;'
      if (v > 0) return 'background:#43a047;color:white;'
      return 'color:#777;'
    }
    return 'color:#1976D2;font-weight:600;'
  }
  if (v >= 90) return 'background:#4CAF50;color:white;'
  if (v >= 70) return 'background:#FFC107;color:black;'
  if (v > 0) return 'background:#F44336;color:white;'
  return 'color:#999;'
}

onMounted(loadData)
</script>

<style scoped>
.table-container {
  overflow: auto;
  max-height: 70vh;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: white;
}
.attendance-table {
  width: max-content;
  border-collapse: collapse;
  font-size: 13px;
}
.attendance-table th,
.attendance-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
  text-align: center;
  white-space: nowrap;
}
.sticky-left {
  position: sticky;
  left: 0;
  z-index: 15;
  background: white;
  font-weight: 600;
  text-align: left;
  border-right: 1px solid #e0e0e0;
  padding-left: 12px;
}
.header-left {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 20;
  background: #f6f8fb !important;
  font-weight: 700;
}
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f6f8fb;
  font-weight: 600;
}
.summary {
  color: #1976d2;
  text-transform: uppercase;
  font-weight: 600;
}
.attendance-table tr:hover td {
  background-color: #fafafa;
  transition: background 0.2s;
}
.text-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
.text-btn {
  text-transform: none;
  font-weight: 600;
  color: #1976d2;
}
.text-btn:disabled {
  color: #ccc !important;
}
.page-indicator {
  font-weight: 500;
  color: #444;
}
</style>
