<!-- src/views/ta/TADashboard.vue -->

<template>
  <v-container fluid class="pa-2 pt-0">
    <!-- 🔹 Filters -->
    <v-sheet elevation="2" class="sticky-filter pa-3" color="white">
      <div class="page-title-row mb-3">
        <div>
          <h2 class="page-title">TA Dashboard</h2>
          <p class="page-subtitle">
            Recruitment overview, charts, and KPI summary.
          </p>
        </div>
      </div>

      <v-row dense>
        <v-col cols="6" sm="4" md="2.4">
          <v-select
            v-model="filterType"
            :items="filterOptions"
            label="Candidate Type"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="6" sm="4" md="2.4">
          <v-select
            v-model="filterRecruiter"
            :items="recruiterOptions"
            label="Recruiter"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="6" sm="4" md="2.4">
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
          />
        </v-col>

        <v-col cols="6" sm="3" md="2.4">
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
              />
            </template>

            <v-date-picker
              v-model="from"
              @update:model-value="updateFromDisplay"
            />
          </v-menu>
        </v-col>

        <v-col cols="6" sm="3" md="2.4">
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
              />
            </template>

            <v-date-picker
              v-model="to"
              @update:model-value="updateToDisplay"
            />
          </v-menu>
        </v-col>
      </v-row>

      <v-row dense class="mt-2">
        <v-col cols="6" md="2">
          <v-select
            v-model="selectedYear"
            :items="yearOptions"
            label="Select Year"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>
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
  top: 5px;
  z-index: 10;
  background-color: white;
  border-radius: 10px;
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #263238;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: #607d8b;
  margin: 2px 0 0;
}
</style>