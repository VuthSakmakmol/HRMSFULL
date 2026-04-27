<!-- src/views/ta/TADashboard.vue -->

<template>
  <v-container fluid class="pa-2 pt-0">
    <!-- 🔹 Filters -->
    <v-sheet elevation="2" class="sticky-filter compact-dashboard-filter" color="white">
  <div class="filter-bar">
    <div class="filter-title-box">
      <h2 class="page-title">TA Dashboard</h2>
      <p class="page-subtitle">Recruitment overview</p>
    </div>

    <div class="dashboard-filter-grid">
      <v-select
        v-model="filterType"
        :items="filterOptions"
        label="Type"
        variant="outlined"
        density="compact"
        hide-details
        class="filter-input"
      />

      <v-select
        v-model="filterRecruiter"
        :items="recruiterOptions"
        label="Recruiter"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="filter-input"
      />

      <v-autocomplete
        v-model="filterDepartment"
        :items="departmentOptions"
        item-title="name"
        item-value="_id"
        label="Department"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="filter-input"
      />

      <v-menu v-model="fromMenu" :close-on-content-click="false">
        <template #activator="{ props }">
          <v-text-field
            v-model="fromDisplay"
            label="From"
            readonly
            v-bind="props"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-input"
          />
        </template>

        <v-date-picker
          v-model="from"
          @update:model-value="updateFromDisplay"
        />
      </v-menu>

      <v-menu v-model="toMenu" :close-on-content-click="false">
        <template #activator="{ props }">
          <v-text-field
            v-model="toDisplay"
            label="To"
            readonly
            v-bind="props"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-input"
          />
        </template>

        <v-date-picker
          v-model="to"
          @update:model-value="updateToDisplay"
        />
      </v-menu>

      <v-select
        v-model="selectedYear"
        :items="yearOptions"
        label="Year"
        variant="outlined"
        density="compact"
        hide-details
        class="filter-input year-filter"
      />
    </div>
  </div>
</v-sheet>

    <!-- 🔹 Charts and KPI only -->
    <v-row class="mt-3">
      <v-col cols="12" md="4">
        <RecruitmentPipelineChart :pipeline="pipelineData" />
      </v-col>

      <v-col cols="12" md="4">
        <SourcePie
          :series="sourceData.counts"
          :labels="sourceData.labels"
        />
      </v-col>

      <v-col cols="12" md="4">
        <FinalDecisionPie
          :series="decisionData.counts"
          :labels="decisionData.labels"
        />
      </v-col>

      <v-col cols="12" md="6">
        <MonthlyApplicationLine
          :labels="monthlyData.labels"
          :series="monthlyData.counts"
        />
      </v-col>

      <v-col cols="12" md="6">
        <VacancyKPI
          :typeLabel="filterType"
          :data="kpiData"
          :loading="loadingKpi"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// src/views/ta/TADashboard.vue

import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'
import socket, { joinSocketRoom } from '@/utils/socket'

// Components
import RecruitmentPipelineChart from '@/tacomponents/RecruitmentPipelineChart.vue'
import SourcePie from '@/tacomponents/SourcePie.vue'
import FinalDecisionPie from '@/tacomponents/FinalDecisionPie.vue'
import MonthlyApplicationLine from '@/tacomponents/MonthlyApplicationLine.vue'
import VacancyKPI from '@/tacomponents/VacancyKPI.vue'

// Filters
const filterType = ref('White Collar')
const filterRecruiter = ref(null)
const filterDepartment = ref(null)

const filterOptions = [
  'White Collar',
  'Blue Collar - Sewer',
  'Blue Collar - Non-Sewer',
]

const recruiterOptions = ref([])
const departmentOptions = ref([])

const from = ref(dayjs().startOf('year').format('YYYY-MM-DD'))
const to = ref(dayjs().endOf('year').format('YYYY-MM-DD'))

const fromDisplay = ref(dayjs(from.value).format('DD/MM/YYYY'))
const toDisplay = ref(dayjs(to.value).format('DD/MM/YYYY'))

const fromMenu = ref(false)
const toMenu = ref(false)

const monthlyData = ref({
  labels: [],
  counts: [],
})

const sourceData = ref({
  labels: [],
  counts: [],
})

const decisionData = ref({
  labels: [],
  counts: [],
})

const pipelineData = ref({})
const kpiData = ref({})
const loadingKpi = ref(false)

const userCompany = ref(localStorage.getItem('company') || '')
const selectedYear = ref(dayjs().year())

const yearOptions = Array.from({ length: 6 }, (_, i) => dayjs().year() - i)

let dashboardUpdateTimeout = null

const updateFromDisplay = () => {
  fromDisplay.value = dayjs(from.value).format('DD/MM/YYYY')
  fromMenu.value = false
}

const updateToDisplay = () => {
  toDisplay.value = dayjs(to.value).format('DD/MM/YYYY')
  toMenu.value = false
}

const getType = () => {
  if (filterType.value === 'Blue Collar - Sewer') {
    return {
      type: 'Blue Collar',
      subType: 'Sewer',
    }
  }

  if (filterType.value === 'Blue Collar - Non-Sewer') {
    return {
      type: 'Blue Collar',
      subType: 'Non-Sewer',
    }
  }

  return {
    type: 'White Collar',
    subType: null,
  }
}

const applyDashboardData = (data = {}) => {
  sourceData.value = data.sources || {
    labels: [],
    counts: [],
  }

  decisionData.value = data.decisions || {
    labels: [],
    counts: [],
  }

  pipelineData.value = data.pipeline || {}
  kpiData.value = data.kpi || {}

  monthlyData.value = data.monthly || {
    labels: [],
    counts: [],
  }
}

const fetchDashboardStats = async () => {
  const { type, subType } = getType()

  loadingKpi.value = true

  try {
    const res = await axios.post('/dashboard/stats', {
      type,
      subType,
      recruiter: filterRecruiter.value || null,
      departmentId: filterDepartment.value || null,
      from: from.value,
      to: to.value,
      year: selectedYear.value,
      company: userCompany.value,
    })

    applyDashboardData(res.data || {})
  } catch (err) {
    console.error('❌ Dashboard stats fetch failed:', err)
  } finally {
    loadingKpi.value = false
  }
}

const fetchDepartments = async () => {
  try {
    const res = await axios.get('/departments', {
      params: {
        company: userCompany.value,
      },
    })

    departmentOptions.value = Array.isArray(res.data)
      ? res.data.filter((dep) => dep.company === userCompany.value)
      : []
  } catch (err) {
    console.error('❌ Department fetch error:', err)
  }
}

const fetchRecruiters = async () => {
  try {
    const res = await axios.get('/recruiters', {
      params: {
        company: userCompany.value,
      },
    })

    recruiterOptions.value = Array.isArray(res.data)
      ? res.data
          .filter((recruiter) => recruiter.company === userCompany.value)
          .map((recruiter) => recruiter.name)
      : []
  } catch (err) {
    console.error('❌ Recruiter fetch error:', err)
  }
}

const handleSocketConnect = () => {
  console.log('🔌 Connected to dashboard socket')
}

const handleSocketError = (err) => {
  console.error('🚨 Socket connect error:', err.message)
}

const handleDashboardUpdate = (payload) => {
  const company = String(userCompany.value || '').toUpperCase()

  if (!payload || !payload.company || payload.company !== company) return

  console.log('🟢 Real-time dashboard update received:', payload)

  if (payload.data) {
    applyDashboardData(payload.data)
  }

  clearTimeout(dashboardUpdateTimeout)

  dashboardUpdateTimeout = setTimeout(() => {
    fetchDashboardStats()
  }, 300)
}

onMounted(() => {
  fetchDashboardStats()
  fetchDepartments()
  fetchRecruiters()

  joinSocketRoom()

  socket.on('connect', handleSocketConnect)
  socket.on('dashboardUpdate', handleDashboardUpdate)
  socket.on('connect_error', handleSocketError)
})

onBeforeUnmount(() => {
  clearTimeout(dashboardUpdateTimeout)

  socket.off('connect', handleSocketConnect)
  socket.off('dashboardUpdate', handleDashboardUpdate)
  socket.off('connect_error', handleSocketError)
})

watch(
  [
    filterType,
    filterRecruiter,
    filterDepartment,
    from,
    to,
    selectedYear,
  ],
  fetchDashboardStats
)
</script>
<style scoped>
.sticky-filter {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: white;
  border-radius: 0 0 10px 10px;
  margin-top: 0;
  margin-bottom: 0;
}

.compact-dashboard-filter {
  padding: 8px 10px;
}

.filter-bar {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.filter-title-box {
  min-width: 0;
}

.page-title {
  font-size: 17px;
  font-weight: 700;
  color: #263238;
  margin: 0;
  line-height: 1.15;
  white-space: nowrap;
}

.page-subtitle {
  font-size: 11px;
  color: #607d8b;
  margin: 1px 0 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dashboard-filter-grid {
  display: grid;
  grid-template-columns:
    minmax(145px, 1.15fr)
    minmax(125px, 1fr)
    minmax(145px, 1.1fr)
    minmax(105px, 0.75fr)
    minmax(105px, 0.75fr)
    minmax(90px, 0.65fr);
  gap: 8px;
  align-items: center;
}

.filter-input {
  min-width: 0;
}

.year-filter {
  max-width: 110px;
}

:deep(.v-field) {
  font-size: 12px;
}

:deep(.v-field__input) {
  min-height: 36px;
  padding-top: 6px;
  padding-bottom: 6px;
}

:deep(.v-label) {
  font-size: 12px;
}

/* Medium screen: title on top, filters still compact */
@media (max-width: 1280px) {
  .filter-bar {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .filter-title-box {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .dashboard-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .year-filter {
    max-width: none;
  }
}

/* Mobile/tablet */
@media (max-width: 700px) {
  .dashboard-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-title-box {
    display: block;
  }
}

@media (max-width: 480px) {
  .dashboard-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>