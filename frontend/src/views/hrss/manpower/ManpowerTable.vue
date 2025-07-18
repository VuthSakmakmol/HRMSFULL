<template>
  <v-card>
    <!-- ─── Title + Controls ────────────────────────────────────────────────────── -->
    <v-card-title class="d-flex align-center">
      <span class="text-h6">Manpower Summary</span>
      <v-spacer />

      <v-btn color="primary" @click="goToTargets">
        SET / UPDATE TARGETS
      </v-btn>
      <v-btn class="ml-2" color="secondary" @click="fetchSummary" :loading="isLoading">
        REFRESH
      </v-btn>

      <!-- Year/Month selectors -->
      <v-select
        v-model="selectedYear"
        :items="years"
        label="Year"
        dense
        density="compact"
        variant="outlined"
        hide-details
        style="max-width:100px; margin-left:1rem"
        @change="fetchSummary"
      />
      <v-select
        v-model="selectedMonth"
        :items="months"
        item-title="text"
        item-value="value"
        label="Month"
        dense
        variant="outlined"
        density="compact"
        hide-details
        style="max-width:120px; margin-left:1rem"
        @change="fetchSummary"
      />
    </v-card-title>

    <!-- ─── Table ─────────────────────────────────────────────────────────────── -->
    <v-card-text class="pa-0">
      <table class="manpower-table">
        <thead>
          <tr class="header">
            <th>Department</th>
            <th class="text-center">Budget</th>
            <th class="text-center">Actual</th>
            <th class="text-center">Difference</th>
            <th class="text-center">Positions</th>
          </tr>
        </thead>
        <tbody>
          <!-- no-data -->
          <tr v-if="!departments.length && !isLoading">
            <td colspan="5" class="text-center py-4">
              No data for {{ yearMonth }}.
            </td>
          </tr>

          <!-- department rows -->
          <template v-for="dept in departments" :key="dept.department">
            <tr class="dept-row">
              <td>{{ dept.department }}</td>
              <td class="text-center">{{ dept.target }}</td>
              <td class="text-center">{{ dept.total }}</td>
              <td class="text-center">{{ dept.difference }}</td>
              <td class="text-center">
                <v-icon small class="cursor-pointer"
                        @click="toggleDept(dept.department)">
                  {{ expanded.includes(dept.department)
                    ? 'mdi-chevron-down'
                    : 'mdi-chevron-right' }}
                </v-icon>
              </td>
            </tr>
            <!-- position rows -->
            <tr
              v-for="pos in dept.positions"
              :key="dept.department + '|' + pos.position"
              v-show="expanded.includes(dept.department)"
            >
              <td class="sub-cell">— {{ pos.position }}</td>
              <td class="text-center">{{ pos.target }}</td>
              <td class="text-center">{{ pos.total }}</td>
              <td class="text-center">{{ pos.difference }}</td>
              <td></td>
            </tr>
          </template>

          <!-- total head count row -->
          <tr v-if="departments.length" class="total-row">
            <td>Total Head Count</td>
            <td class="text-center">{{ totalTarget }}</td>
            <td class="text-center">{{ totalActual }}</td>
            <td class="text-center">{{ totalDifference }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </v-card-text>

    <!-- ─── Footer (optional) ─────────────────────────────────────────────────── -->
    <v-card-actions class="justify-end">
      <div v-if="departments.length && !isLoading">
        Items per page: <strong>all</strong> &nbsp;|&nbsp; {{ departments.length }} rows
      </div>
      <div v-else-if="isLoading" class="pa-4 text-center">Loading…</div>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

// router + selections
const router        = useRouter()
const selectedYear  = ref(dayjs().format('YYYY'))
const selectedMonth = ref(dayjs().format('MM'))

// compute yearMonth for API
const yearMonth = computed(() => `${selectedYear.value}-${selectedMonth.value}`)

// year/month lists
const currentYear = dayjs().year()
const years       = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i))
const months      = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1).padStart(2, '0')
  const text  = dayjs().month(i).format('MMMM')
  return { text, value }
})

// table data + state
const departments = ref([])
const isLoading   = ref(false)
const expanded    = ref([])

function toggleDept(dept) {
  const idx = expanded.value.indexOf(dept)
  if (idx >= 0) expanded.value.splice(idx, 1)
  else          expanded.value.push(dept)
}

async function fetchSummary() {
  isLoading.value = true
  try {
    const company = localStorage.getItem('company')
    const { data } = await axios.get('/hrss/manpower/summary', {
      params: { company, yearMonth: yearMonth.value }
    })

    const map = new Map()
    data.forEach(({ department, position, total, target, difference }) => {
      if (!map.has(department)) {
        map.set(department, {
          department,
          total: 0,
          target: 0,
          difference: 0,
          positions: []
        })
      }
      const d = map.get(department)
      d.total      += total
      d.target     += target
      d.difference += difference
      d.positions.push({ position, total, target, difference })
    })
    departments.value = Array.from(map.values())
    expanded.value   = []
  } catch (err) {
    console.error('Failed to load manpower summary', err)
    departments.value = []
  } finally {
    isLoading.value = false
  }
}

function goToTargets() {
  router.push('/hrss/manpower/targets')
}

// computed totals
const totalTarget     = computed(() => departments.value.reduce((sum,d) => sum + d.target, 0))
const totalActual     = computed(() => departments.value.reduce((sum,d) => sum + d.total,  0))
const totalDifference = computed(() => departments.value.reduce((sum,d) => sum + d.difference, 0))

onMounted(fetchSummary)
</script>

<style scoped>
/* ---------------------------------------------------------------------------
   You can customize these two colors here:
   --dept-bg-color:     background for each department row
   --total-bg-color:    background for the Total Head Count row
---------------------------------------------------------------------------- */
.manpower-table {
  --dept-bg-color: rgba(131, 210, 133, 0.3);  /* light green */
  --total-bg-color: rgba(255, 217, 0, 0.2); /* light yellow */
  --header-bg-color: rgba( 33, 150, 243, 0.2);   /* header row */
  width: 100%;
  border-collapse: collapse;
}
.manpower-table th,
.manpower-table td {
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 8px;
}
.manpower-table th {
  background-color: #fafafa;
  text-align: left;
  font-weight: 600;
}

/* department rows */
.dept-row > td {
  background-color: var(--dept-bg-color) !important;
}

/* total head count row styling */
.total-row > td {
  background-color: var(--total-bg-color) !important;
  font-weight: 600;
}

.manpower-table .text-center {
  text-align: center;
}
.cursor-pointer {
  cursor: pointer;
}
.sub-cell {
  padding-left: 1.5rem;
  color: rgba(0, 0, 0, 0.7);
}

</style>
