<template>
  <v-container fluid>
    <!-- 🔹 Filters -->
    <v-sheet elevation="2" class="pa-2 mb-4 sticky-filter" color="white">
      <v-row dense>
        <v-col cols="12" sm="4" md="2.4">
          <v-select
            v-model="filterType"
            :items="filterOptions"
            label="Candidate Type"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="4" md="2.4">
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

        <v-col cols="12" sm="4" md="2.4">
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
                prepend-icon="mdi-calendar"
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
                prepend-icon="mdi-calendar"
                variant="outlined"
                density="compact"
                hide-details
              />
            </template>
            <v-date-picker v-model="to" @update:model-value="updateToDisplay" />
          </v-menu>
        </v-col>
      </v-row>
    </v-sheet>

    <!-- 🔹 Charts -->
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
        <MonthlyApplicationLine />
      </v-col>
      <v-col cols="12" md="6">
        <VacancyKPI :typeLabel="filterType" :data="kpiData" :loading="loadingKpi" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

import RecruitmentPipelineChart from '@/tacomponents/RecruitmentPipelineChart.vue'
import SourcePie from '@/tacomponents/SourcePie.vue'
import FinalDecisionPie from '@/tacomponents/FinalDecisionPie.vue'
import MonthlyApplicationLine from '@/tacomponents/MonthlyApplicationLine.vue'
import VacancyKPI from '@/tacomponents/VacancyKPI.vue'

// state
const filterType = ref('White Collar')
const filterRecruiter = ref(null)
const filterDepartment = ref(null)

const from = ref(dayjs().startOf('year').format('YYYY-MM-DD'))
const to = ref(dayjs().endOf('year').format('YYYY-MM-DD'))
const fromDisplay = ref(dayjs(from.value).format('DD/MM/YYYY'))
const toDisplay = ref(dayjs(to.value).format('DD/MM/YYYY'))
const fromMenu = ref(false)
const toMenu = ref(false)

const filterOptions = ['White Collar', 'Blue Collar - Sewer', 'Blue Collar - Non-Sewer']
const recruiterOptions = ref([])
const departmentOptions = ref([])
const sourceData = ref({ labels: [], counts: [] })
const decisionData = ref({ labels: [], counts: [] })
const pipelineData = ref({})
const kpiData = ref({})
const loadingKpi = ref(false)

// company from localStorage
const userCompany = ref(localStorage.getItem('company'))

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
      year: dayjs().year(),
      company: userCompany.value
    })

    sourceData.value = res.data.sources || { labels: [], counts: [] }
    decisionData.value = res.data.decisions || { labels: [], counts: [] }
    pipelineData.value = res.data.pipeline || {}
    kpiData.value = res.data.kpi || {}
  } catch (err) {
    console.error('❌ Dashboard stats fetch failed:', err)
  }
}

const fetchDepartments = async () => {
  try {
    const res = await axios.get('/departments', {
      params: { company: userCompany.value }
    })
    departmentOptions.value = Array.isArray(res.data)
      ? res.data.filter(dep => dep.company === userCompany.value)
      : []
  } catch (err) {
    departmentOptions.value = []
    console.error('❌ Department fetch error:', err)
  }
}

const fetchRecruiters = async () => {
  try {
    const res = await axios.get('/recruiters', {
      params: { company: userCompany.value }
    })
    recruiterOptions.value = Array.isArray(res.data)
      ? res.data
          .filter(r => r.company === userCompany.value)
          .map(r => r.name)
      : []
  } catch (err) {
    recruiterOptions.value = []
    console.error('❌ Recruiter fetch error:', err)
  }
}

onMounted(() => {
  fetchDashboardStats()
  fetchDepartments()
  fetchRecruiters()
})

watch([filterType, filterRecruiter, filterDepartment, from, to], fetchDashboardStats)
</script>

<style scoped>
.sticky-filter {
  position: sticky;
  top: 64px;
  z-index: 10;
  background-color: white;
}
</style>
