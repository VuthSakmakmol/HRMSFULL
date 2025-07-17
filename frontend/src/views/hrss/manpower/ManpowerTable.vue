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
      <v-text-field
        v-model="yearMonth"
        type="month"
        dense
        hide-details
        style="max-width:140px; margin-left:1rem"
        @change="fetchSummary"
      />
    </v-card-title>

    <!-- ─── Table ─────────────────────────────────────────────────────────────── -->
    <v-card-text class="pa-0">
      <table class="manpower-table">
        <thead>
          <tr>
            <th>Department</th>
            <th class="text-center">Target</th>
            <th class="text-center">Actual</th>
            <th class="text-center">Difference</th>
            <th class="text-center">Positions</th>
          </tr>
        </thead>
        <tbody>
          <!-- no-data -->
          <tr v-if="!departments.length && !isLoading">
            <td colspan="5" class="text-center py-4">No data for {{ yearMonth }}.</td>
          </tr>

          <!-- department rows -->
          <template v-for="dept in departments" :key="dept.department">
            <tr>
              <td>{{ dept.department }}</td>
              <td class="text-center">{{ dept.target }}</td>
              <td class="text-center">{{ dept.total }}</td>
              <td class="text-center">{{ dept.difference }}</td>
              <td class="text-center">
                <v-icon
                  small
                  class="cursor-pointer"
                  @click="toggleDept(dept.department)"
                >
                  {{ expanded.includes(dept.department) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

const router      = useRouter()
const yearMonth   = ref(dayjs().format('YYYY-MM'))
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

    // group by department
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

    // collapse all on each reload
    expanded.value = []
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

onMounted(fetchSummary)
</script>

<style scoped>
.manpower-table {
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
.manpower-table .text-center {
  text-align: center;
}
.cursor-pointer {
  cursor: pointer;
}
.sub-cell {
  padding-left: 1.5rem;
  color: rgba(0,0,0,0.7);
}
</style>
