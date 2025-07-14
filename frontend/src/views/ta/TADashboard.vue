<template>
<v-container fluid class="pa-2 pt-0">
    <!-- 🔹 Filters -->
    <v-sheet elevation="2" class=" sticky-filter" color="white">
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
            <v-date-picker v-model="from" @update:model-value="updateFromDisplay" />
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
            <v-date-picker v-model="to" @update:model-value="updateToDisplay" />
          </v-menu>
        </v-col>
      </v-row>

      <v-row dense class="mb-2">
        <v-col cols="6" md="2">
          <v-select
            v-model="viewMode"
            :items="['month', 'quarter', 'year']"
            label="Report View"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>


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

    <!-- 🔹 Charts and Tables -->
    <v-row>
      <v-col cols="12" md="4">
        <RecruitmentPipelineChart :pipeline="pipelineData" />
      </v-col>
      <v-col cols="12" md="4">
        <SourcePie :series="sourceData.counts" :labels="sourceData.labels" />
      </v-col>
      <v-col cols="12" md="4">
        <FinalDecisionPie :series="decisionData.counts" :labels="decisionData.labels" />
      </v-col>

      <v-col cols="12" md="6">
        <MonthlyApplicationLine
          :labels="monthlyData.labels"
          :series="monthlyData.counts"
        />
      </v-col>
      <v-col cols="12" md="6">
        <VacancyKPI :typeLabel="filterType" :data="kpiData" :loading="loadingKpi" />
      </v-col>

      <!-- 📊 Report Table -->
      <v-col cols="12">
        <RecruitmentReportTable
          :type="getType().type"
          :subType="getType().subType"
          :view="viewMode"
          :year="selectedYear"
          :quarter="selectedQuarter"
          :month="getSelectedMonthIndex()"
          :company="selectedCompany"
          :roadmap="roadmapData" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'
import socket, { joinSocketRoom } from '@/utils/socket'

// Components
import RecruitmentPipelineChart from '@/tacomponents/RecruitmentPipelineChart.vue'
import SourcePie from '@/tacomponents/SourcePie.vue'
import FinalDecisionPie from '@/tacomponents/FinalDecisionPie.vue'
import MonthlyApplicationLine from '@/tacomponents/MonthlyApplicationLine.vue'
import VacancyKPI from '@/tacomponents/VacancyKPI.vue'
import RecruitmentReportTable from '@/tacomponents/RecruitmentReportTable.vue'

// Filters
const filterType = ref('White Collar')
const filterRecruiter = ref(null)
const filterDepartment = ref(null)
const filterOptions = ['White Collar', 'Blue Collar - Sewer', 'Blue Collar - Non-Sewer']

const recruiterOptions = ref([])
const departmentOptions = ref([])

const from = ref(dayjs().startOf('year').format('YYYY-MM-DD'))
const to = ref(dayjs().endOf('year').format('YYYY-MM-DD'))
const fromDisplay = ref(dayjs(from.value).format('DD/MM/YYYY'))
const toDisplay = ref(dayjs(to.value).format('DD/MM/YYYY'))
const fromMenu = ref(false)
const toMenu = ref(false)

const monthlyData = ref({ labels: [], counts: [] })
const sourceData = ref({ labels: [], counts: [] })
const decisionData = ref({ labels: [], counts: [] })
const pipelineData = ref({})
const kpiData = ref({})
const roadmapData = ref({
  roadmapHC: Array(12).fill(0),
  actualHC: Array(12).fill(0),
  hiringTargetHC: Array(12).fill(0)
})
const loadingKpi = ref(false)

const userCompany = ref(localStorage.getItem('company'))
const selectedCompany = ref(userCompany.value)

const viewMode = ref('month')
const selectedYear = ref(dayjs().year())
const selectedQuarter = ref(null)
const selectedMonth = ref(null)
const monthOptions = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const yearOptions = Array.from({ length: 6 }, (_, i) => dayjs().year() - i)

const updateFromDisplay = () => {
  fromDisplay.value = dayjs(from.value).format('DD/MM/YYYY')
  fromMenu.value = false
}
const updateToDisplay = () => {
  toDisplay.value = dayjs(to.value).format('DD/MM/YYYY')
  toMenu.value = false
}

const getType = () => {
  if (filterType.value === 'Blue Collar - Sewer') return { type: 'Blue Collar', subType: 'Sewer' }
  if (filterType.value === 'Blue Collar - Non-Sewer') return { type: 'Blue Collar', subType: 'Non-Sewer' }
  return { type: 'White Collar', subType: null }
}

const getSelectedMonthIndex = () => {
  if (viewMode.value !== 'month' || !selectedMonth.value) return null
  return monthOptions.indexOf(selectedMonth.value) + 1
}

const fetchDashboardStats = async () => {
  const { type, subType } = getType()
  try {
    const res = await axios.post('/dashboard/stats', {
      type,
      subType,
      recruiter: filterRecruiter.value || null,
      departmentId: filterDepartment.value || null,
      from: from.value,
      to: to.value,
      year: selectedYear.value,
      company: userCompany.value
    })

    const data = res.data || {}
    sourceData.value = data.sources || { labels: [], counts: [] }
    decisionData.value = data.decisions || { labels: [], counts: [] }
    pipelineData.value = data.pipeline || {}
    kpiData.value = data.kpi || {}
    roadmapData.value = data.roadmap || {
      roadmapHC: Array(12).fill(0),
      actualHC: Array(12).fill(0),
      hiringTargetHC: Array(12).fill(0)
    }
    monthlyData.value = data.monthly || { labels: [], counts: [] }
  } catch (err) {
    console.error('❌ Dashboard stats fetch failed:', err)
  }
}

const fetchDepartments = async () => {
  try {
    const res = await axios.get('/departments', { params: { company: userCompany.value } })
    departmentOptions.value = Array.isArray(res.data)
      ? res.data.filter(dep => dep.company === userCompany.value)
      : []
  } catch (err) {
    console.error('❌ Department fetch error:', err)
  }
}

const fetchRecruiters = async () => {
  try {
    const res = await axios.get('/recruiters', { params: { company: userCompany.value } })
    recruiterOptions.value = Array.isArray(res.data)
      ? res.data.filter(r => r.company === userCompany.value).map(r => r.name)
      : []
  } catch (err) {
    console.error('❌ Recruiter fetch error:', err)
  }
}

onMounted(() => {
  fetchDashboardStats()
  fetchDepartments()
  fetchRecruiters()

  joinSocketRoom()

  socket.on('connect', () => console.log('🔌 Connected to dashboard socket'))

  let dashboardUpdateTimeout = null

  socket.on('dashboardUpdate', (payload) => {
    if (!payload || !payload.company || payload.company !== userCompany.value.toUpperCase()) return
    console.log('🟢 Real-time dashboard update received:', payload)

    const data = payload.data
    if (!data) return

    // 🔥 Instantly update reactive dashboard data
    sourceData.value = data.sources || { labels: [], counts: [] }
    decisionData.value = data.decisions || { labels: [], counts: [] }
    pipelineData.value = data.pipeline || {}
    kpiData.value = data.kpi || {}
    roadmapData.value = data.roadmap || {
      roadmapHC: Array(12).fill(0),
      actualHC: Array(12).fill(0),
      hiringTargetHC: Array(12).fill(0)
    }
    monthlyData.value = data.monthly || { labels: [], counts: [] }  // ✅ Real-time monthly update

    clearTimeout(dashboardUpdateTimeout)
    dashboardUpdateTimeout = setTimeout(() => {
      fetchDashboardStats()
    }, 300)
  })

  socket.on('connect_error', (err) => console.error('🚨 Socket connect error:', err.message))
})

watch([filterType, filterRecruiter, filterDepartment, from, to], fetchDashboardStats)
</script>



<style scoped>
.sticky-filter {
  position: sticky;
  top: 5px; /* match your AppTopbar height */
  z-index: 10;
  background-color: white;
  
}
</style>
