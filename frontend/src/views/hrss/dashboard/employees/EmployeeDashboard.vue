<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">Employee Dashboard</h2>

    <!-- GLOBAL FILTERS -->
    <v-row class="mb-6" dense>
      <v-col cols="12" sm="4">
        <v-select
          v-model="selectedPeriod"
          :items="periodOptions"
          item-title="text"
          item-value="value"
          label="Period"
          dense
          density="compact"
          hide-details
          variant="outlined"
        />
      </v-col>

      <v-col cols="12" sm="4" v-if="selectedPeriod !== 'all'">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Year"
          dense
          hide-details
          variant="outlined"
        />
      </v-col>
    </v-row>

    <v-row dense>
      

      <!-- 2) Overall Join Trends -->
      <v-col cols="12" sm="4">
        <MonthlyJoinChart
          :chart-data="monthlyProcessed"
        />
      </v-col>

      <!-- 3) Sewer & Jumper Comparison -->
      <v-col cols="12" sm="4">
        <PositionCountChart
          :chart-data="positionProcessed"
        />
      </v-col>

      <!-- 1) Total Employees -->
      <v-col cols="12" sm="4">
        <TotalEmployeesCard
          :total="summary.total"
          :trend="summary.trend"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from '@/utils/axios'

// Charts & Cards
import TotalEmployeesCard   from './charts/TotalEmployeesCard.vue'
import MonthlyJoinChart     from './charts/MonthlyJoinChart.vue'
import PositionCountChart   from './charts/PositionCountChart.vue'


// ─── RAW DATA STATES ───────────────────────────────────────────────
const summary            = ref({ total: 0, trend: [] })
const monthlyRaw         = ref({ labels: [], counts: [] })
const positionRaw        = ref({ labels: [], sewer: [], jumper: [], combined: [] })
const merchMonthlyRaw    = ref({ labels: [], counts: [] })
const otherPivot         = ref({ labels: [], series: [] })

// ─── GLOBAL FILTER STATE ──────────────────────────────────────────
const periodOptions  = [
  { text: 'All',       value: 'all'      },
  { text: 'Yearly',    value: 'yearly'   },
  { text: 'Quarterly', value: 'quarterly'}
]
const selectedPeriod = ref('all')
const selectedYear   = ref(null)
watch(selectedPeriod, () => { selectedYear.value = null })

// derive year options from the main monthly data
const yearOptions = computed(() => {
  const years = new Set(monthlyRaw.value.labels.map(l => l.slice(0,4)))
  return Array.from(years).sort()
})

// ─── FETCH EVERYTHING ON MOUNT ────────────────────────────────────
onMounted(async () => {
  const company = localStorage.getItem('company')
  if (!company) return

  // 1) Total / Male / Female summary
  try {
    const { data } = await axios.get('/hrss/dashboard/employees', { params:{ company } })
    summary.value = {
      total: data.total || 0,
      trend: data.trend || []
    }
  } catch (err) {
    console.error('Failed to fetch summary:', err)
  }

  // 2) Overall monthly join
  try {
    const { data } = await axios.get('/hrss/dashboard/employees/monthly', { params:{ company }})
    monthlyRaw.value = {
      labels: data.map(r => r._id),
      counts: data.map(r => r.count)
    }
  } catch (err) {
    console.error('Failed to fetch overall monthly joins:', err)
  }

  // 3) Sewer & Jumper monthly counts
  try {
    const { data } = await axios.get('/hrss/dashboard/employees/positions/monthly', { params:{ company }})
    positionRaw.value = {
      labels:   data.labels,
      sewer:    data.sewer,
      jumper:   data.jumper,
      combined: data.combined
    }
  } catch (err) {
    console.error('Failed to fetch position counts:', err)
  }

  // 4) Merchandising monthly join (uses the new endpoint)
  try {
    const { data } = await axios.get(
      '/hrss/dashboard/employees/monthly/merchandising',
      { params:{ company } }
    )
    merchMonthlyRaw.value = {
      labels: data.map(r => r._id),
      counts: data.map(r => r.count)
    }
  } catch (err) {
    console.error('Failed to fetch merchandising monthly joins:', err)
  }

  // fetch “other positions” monthly join trend
  try {
    const { data } = await axios.get(
      '/hrss/dashboard/employees/monthly/positions/others',
      { params: { company } }
    )
    // data is [{ _id: 'YYYY-MM', count: N }, …]
     otherPivot.value = data
  } catch (err) {
    console.error('❌ Failed to fetch other positions monthly joins:', err)
  }


})

// ─── PROCESS & FILTER HELPERS ──────────────────────────────────────

// helper to zip any monthlyRaw-like state into {date,count} objects
function makeRaw(raw) {
  return raw.labels.map((lbl,i) => ({
    date:  lbl,
    count: raw.counts[i] || 0
  }))
}

// generic filter logic for “All / Yearly / Quarterly”
function makeProcessed(raw) {
  const arr = makeRaw(raw)
  if (selectedPeriod.value === 'all') {
    // just pass through
    return { labels: raw.labels, counts: raw.counts }
  }
  if (selectedPeriod.value === 'yearly') {
    if (!selectedYear.value) return { labels: [], counts: [] }
    const y = selectedYear.value
    const months = Array.from({ length: 12 }, (_, i) =>
      `${y}-${String(i+1).padStart(2,'0')}`
    )
    const counts = months.map(m => {
      const f = arr.find(r => r.date === m)
      return f ? f.count : 0
    })
    return { labels: months, counts }
  }
  if (selectedPeriod.value === 'quarterly') {
    if (!selectedYear.value) return { labels: [], counts: [] }
    const y = selectedYear.value
    const sums = [0,0,0,0]
    arr.forEach(r => {
      if (r.date.startsWith(y)) {
        const m = +r.date.slice(5,7)
        sums[Math.ceil(m/3)-1] += r.count
      }
    })
    return { labels:['Q1','Q2','Q3','Q4'], counts: sums }
  }
  return { labels: [], counts: [] }
}

// computed views
const monthlyProcessed       = computed(() => makeProcessed(monthlyRaw.value))
const merchMonthlyProcessed  = computed(() => makeProcessed(merchMonthlyRaw.value))
const otherProcessed = computed(() => otherPivot.value)

// for Sewer+Jumper we need a custom filter because we have three arrays
const positionProcessed = computed(() => {
  const raw = positionRaw.value
  const arr = raw.labels.map((lbl,i) => ({
    date:     lbl,
    sewer:    raw.sewer[i]    || 0,
    jumper:   raw.jumper[i]   || 0,
    combined: raw.combined[i] || 0
  }))

  if (selectedPeriod.value === 'all') {
    return { ...raw }
  }
  if (selectedPeriod.value === 'yearly') {
    if (!selectedYear.value) return { labels: [], sewer: [], jumper: [], combined: [] }
    const y = selectedYear.value
    const months = Array.from({ length: 12 }, (_, i) =>
      `${y}-${String(i+1).padStart(2,'0')}`
    )
    const s = months.map(m => arr.find(r => r.date===m)?.sewer    || 0)
    const j = months.map(m => arr.find(r => r.date===m)?.jumper   || 0)
    const c = months.map((_,i) => s[i] + j[i])
    return { labels: months, sewer: s, jumper: j, combined: c }
  }
  if (selectedPeriod.value === 'quarterly') {
    if (!selectedYear.value) return { labels: [], sewer: [], jumper: [], combined: [] }
    const y = selectedYear.value
    const sums = { sewer:[0,0,0,0], jumper:[0,0,0,0], combined:[0,0,0,0] }
    arr.forEach(r => {
      if (r.date.startsWith(y)) {
        const idx = Math.ceil(+r.date.slice(5,7)/3)-1
        sums.sewer[idx]    += r.sewer
        sums.jumper[idx]   += r.jumper
        sums.combined[idx] += r.combined
      }
    })
    return {
      labels:   ['Q1','Q2','Q3','Q4'],
      sewer:    sums.sewer,
      jumper:   sums.jumper,
      combined: sums.combined
    }
  }
  return { labels: [], sewer: [], jumper: [], combined: [] }
})
</script>
