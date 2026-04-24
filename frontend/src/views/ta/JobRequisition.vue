<!-- views/ta/JobRequisition.vue -->
<template>
  <v-container fluid>
    <v-card class="pa-4">
      <!-- Tabs -->
      <v-row class="mb-4">
        <v-col cols="auto">
          <v-btn @click="setActive('White Collar')" :color="activeTab === 'White Collar' ? 'primary' : ''">
            White Collar
            <v-badge v-if="alerts['White Collar']" dot color="red" class="ml-2" />
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn @click="setActive('Blue Collar Sewer')" :color="activeTab === 'Blue Collar Sewer' ? 'primary' : ''">
            Blue Collar (Sewer)
            <v-badge v-if="alerts['Blue Collar Sewer']" dot color="red" class="ml-2" />
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn
            @click="setActive('Blue Collar Non-Sewer')"
            :color="activeTab === 'Blue Collar Non-Sewer' ? 'primary' : ''"
          >
            Blue Collar (Non-Sewer)
            <v-badge v-if="alerts['Blue Collar Non-Sewer']" dot color="red" class="ml-2" />
          </v-btn>
        </v-col>
      </v-row>

      <!-- Toggle Buttons -->
      <v-row class="mb-4" dense>
        <v-col cols="auto">
          <v-btn
            color="primary"
            variant="outlined"
            autocomplete="off"
            class="text-white font-weight-bold hover-filled hover-primary"
            elevation="0"
            @click="showCreateForm = !showCreateForm"
          >
            <v-icon start>mdi-plus</v-icon>
            {{ showCreateForm ? 'Close Create Form' : 'New Job Requisition' }}
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn
            color="teal"
            variant="outlined"
            autocomplete="off"
            class="text-white font-weight-bold hover-filled hover-teal"
            elevation="0"
            @click="showFilterForm = !showFilterForm"
          >
            <v-icon start>mdi-magnify</v-icon>
            {{ showFilterForm ? 'Close Filter Form' : 'Filter Requisitions' }}
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn
            color="info"
            variant="outlined"
            autocomplete="off"
            class="text-white font-weight-bold hover-filled hover-info"
            elevation="0"
            :loading="isExporting"
            @click="exportToExcel"
          >
            <v-icon start>mdi-file-excel</v-icon>
            Export to Excel
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <!--
          <v-btn
            color="success"
            variant="outlined"
            autocomplete="off"
            class="text-white font-weight-bold hover-filled"
            elevation="0"
            @click="triggerFileInput"
          >
            <v-icon start>mdi-file-import</v-icon>
            Import from Excel
          </v-btn>
          -->
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx, .xls"
            style="display: none"
            @change="handleFileUpload"
          />
        </v-col>
      </v-row>

      <!-- CREATE FORM -->
      <v-form v-if="showCreateForm" @submit.prevent="isEditing ? updateRequisition() : submitRequisition()">
        <v-row dense>
          <v-col cols="12" md="3">
            <v-autocomplete
              v-model="form.jobTitle"
              :items="jobTitles.map(j => j.jobTitle)"
              label="Job Title"
              clearable
              variant="outlined"
              autocomplete="off"
              density="compact"
              hide-details
              auto-select-first
              @update:modelValue="onJobTitleSelected"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-autocomplete
              v-model="form.recruiter"
              :items="recruiterList"
              label="Recruiter"
              clearable
              variant="outlined"
              autocomplete="off"
              density="compact"
              hide-details
              auto-select-first
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model.number="form.targetCandidates"
              label="Target Candidates"
              type="number"
              min="1"
              variant="outlined"
              autocomplete="off"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-menu v-model="dateMenu" :close-on-content-click="false">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  v-model="form.openingDate"
                  label="Opening Date"
                  readonly
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  autocomplete="off"
                  density="compact"
                  hide-details
                />
              </template>
              <v-date-picker @update:modelValue="date => (form.openingDate = dayjs(date).format('YYYY-MM-DD'))" />
            </v-menu>
          </v-col>

          <v-col cols="12" md="3" v-if="isEditing">
            <v-select
              v-model="form.status"
              :items="['Vacant', 'Filled', 'Suspended', 'Cancel']"
              label="Status"
              variant="outlined"
              autocomplete="off"
              clearable
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="3" v-if="isEditing">
            <v-text-field
              v-model.number="form.hiringCost"
              type="number"
              label="Hiring Cost"
              variant="outlined"
              autocomplete="off"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="3" v-if="isEditing">
            <v-menu v-model="editDateMenu" :close-on-content-click="false">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  v-model="form.startDate"
                  label="New Onboard Start Date"
                  readonly
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  autocomplete="off"
                  density="compact"
                  hide-details
                />
              </template>
              <v-date-picker @update:modelValue="date => (form.startDate = dayjs(date).format('YYYY-MM-DD'))" />
            </v-menu>
          </v-col>

          <v-col cols="12" md="3" class="d-flex align-end">
            <v-btn type="submit" color="success" variant="outlined" autocomplete="off" block>
              {{ isEditing ? 'UPDATE' : 'CREATE' }}
            </v-btn>
          </v-col>
        </v-row>
      </v-form>

      <v-divider class="my-4" />

      <!-- FILTER FORM -->
      <v-row v-if="showFilterForm" class="mb-4" dense>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.jobId"
            label="Job ID"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            autocomplete="off"
            density="compact"
            clearable
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.department"
            label="Department"
            prepend-inner-icon="mdi-office-building"
            variant="outlined"
            autocomplete="off"
            density="compact"
            clearable
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.jobTitle"
            label="Job Title"
            prepend-inner-icon="mdi-briefcase"
            variant="outlined"
            autocomplete="off"
            density="compact"
            clearable
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-menu
            v-model="menu.openingDate"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
          >
            <template #activator="{ props }">
              <v-text-field
                v-bind="props"
                v-model="filters.openingDate"
                label="Opening Date"
                readonly
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </template>
            <v-date-picker
              @update:modelValue="date => (filters.openingDate = dayjs(date).format('YYYY-MM-DD'))"
            />
          </v-menu>
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.recruiter"
            label="Recruiter"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            autocomplete="off"
            density="compact"
            clearable
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-select
            v-model="filters.status"
            :items="['Vacant', 'Filled', 'Suspended', 'Cancel']"
            label="Status"
            variant="outlined"
            density="compact"
            autocomplete="off"
            clearable
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-menu
            v-model="menu.startDate"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
          >
            <template #activator="{ props }">
              <v-text-field
                v-bind="props"
                v-model="filters.startDate"
                label="Start Date"
                readonly
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </template>
            <v-date-picker
              @update:modelValue="date => (filters.startDate = dayjs(date).format('YYYY-MM-DD'))"
            />
          </v-menu>
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.hiringCost"
            label="Hiring Cost"
            prepend-inner-icon="mdi-cash"
            type="number"
            variant="outlined"
            density="compact"
            autocomplete="off"
            clearable
            hide-details
          />
        </v-col>
      </v-row>

      <!-- TABLE -->
      <div
        ref="tableScrollRef"
        class="scroll-wrapper-x"
        @scroll.passive="handleTableScroll"
      >
        <v-table fixed-header class="elevation-1 rounded-lg">
          <thead class="custom-sticky-header">
            <tr>
              <th style="width: 60px">No</th>
              <th>Job ID</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Opening Date</th>
              <th>Recruiter</th>
              <th>Status</th>
              <th>New Onboard Start Date</th>
              <th>Hiring Cost</th>
              <th>Vacancy / Target</th>
              <th>Time to Fill</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(job, index) in requisitions" :key="job._id">
              <td>{{ index + 1 }}</td>
              <td>{{ job.jobRequisitionId }}</td>
              <td>{{ job.departmentName }}</td>
              <td>{{ job.jobTitle }}</td>
              <td>{{ formatDate(job.openingDate) }}</td>
              <td>{{ job.recruiter }}</td>

              <td>
                <v-chip
                  :color="getStatusColor(job.status)"
                  size="small"
                  variant="outlined"
                  @click="goToCandidates(job)"
                >
                  {{ job.status }}
                </v-chip>
              </td>

              <td>{{ formatDate(job.latestOnboardDate || job.startDate) }}</td>
              <td>{{ formatCost(job.hiringCost) }}</td>

              <td>
                <div class="vacancy-cell">
                  <div class="vacancy-pill">
                    <svg
                      class="vacancy-pill__svg"
                      viewBox="0 0 100 36"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <rect
                        class="vacancy-pill__track"
                        x="1.5"
                        y="1.5"
                        width="97"
                        height="33"
                        rx="16.5"
                        ry="16.5"
                        pathLength="100"
                      />
                      <rect
                        class="vacancy-pill__progress"
                        x="1.5"
                        y="1.5"
                        width="97"
                        height="33"
                        rx="16.5"
                        ry="16.5"
                        pathLength="100"
                        :stroke-dasharray="`${getOnboardPercent(job)} 100`"
                      />
                    </svg>

                    <span
                      class="vacancy-pill__text"
                      :class="{ 'is-green': (job.onboardCount || 0) > 0 }"
                    >
                      {{ getVacancyLabel(job) }}
                    </span>
                  </div>
                </div>
              </td>

              <td>
                <span v-if="job.daysToFill != null">
                  {{ job.daysToFill }} Days
                </span>
                <span v-else>-</span>
              </td>

              <td class="action-col">
                <div class="action-cell">
                  <v-btn icon size="small" color="primary" @click="editJob(job)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon size="small" color="error" @click="deleteJob(job)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>

            <tr v-if="!isInitialLoading && !requisitions.length">
              <td colspan="12" class="empty-row text-center">
                No requisitions found.
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <v-row class="mt-4 d-flex align-center" justify="space-between">
        <v-col cols="12">
          <div class="list-footer">
            <div class="list-footer__summary">
              Showing <strong>{{ requisitions.length }}</strong>/<strong>{{ total }}</strong>
            </div>

            <div v-if="isFetchingMore" class="list-footer__status">
              Loading more...
            </div>

            <div v-else-if="!hasMore && requisitions.length" class="list-footer__status">
              All rows loaded
            </div>
          </div>
        </v-col>

        <v-overlay :model-value="isInitialLoading" class="align-center justify-center" persistent>
          <v-progress-circular indeterminate :size="72" :width="6" color="teal" />
        </v-overlay>
      </v-row>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import api from '@/utils/axios'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import socket from '@/utils/socket'

const PAGE_SIZE = 20

const dateMenu = ref(false)
const jobTitles = ref([])
const requisitions = ref([])
const recruiterList = ref([])
const router = useRouter()
const fileInput = ref(null)
const tableScrollRef = ref(null)

const total = ref(0)
const nextPage = ref(1)
const hasMore = ref(true)

const isInitialLoading = ref(false)
const isFetchingMore = ref(false)
const isExporting = ref(false)

const menu = ref({ openingDate: false, startDate: false })
const filters = ref({
  jobId: '',
  department: '',
  jobTitle: '',
  openingDate: '',
  recruiter: '',
  status: '',
  startDate: '',
  hiringCost: '',
})

const showCreateForm = ref(false)
const showFilterForm = ref(false)

const company = localStorage.getItem('company') || ''
let filterDebounceTimer = null

const form = ref({
  jobTitle: '',
  recruiter: '',
  targetCandidates: 1,
  openingDate: '',
  hiringCost: '',
  startDate: '',
  status: 'Vacant',
})

const alerts = ref({
  'White Collar': false,
  'Blue Collar Sewer': false,
  'Blue Collar Non-Sewer': false,
})
const activeTab = ref('White Collar')

const isEditing = ref(false)
const editId = ref(null)
const editDateMenu = ref(false)

const goToCandidates = (job) => {
  router.push({
    path: '/ta/candidates',
    query: {
      jobRequisitionId: job._id,
      jobTitle: job.jobTitle,
    },
  })
}

const getVacancyLabel = (job) => {
  return `${job?.onboardCount || 0}/${job?.targetCandidates || 0}`
}

const getOnboardPercent = (job) => {
  const onboard = Number(job?.onboardCount || 0)
  const target = Number(job?.targetCandidates || 0)

  if (!target || target <= 0) return 0
  return Math.max(0, Math.min(100, (onboard / target) * 100))
}

const fetchRecruiters = async () => {
  try {
    const res = await api.get('/recruiters', { params: { company } })
    recruiterList.value = res.data.map((r) => r.name)
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Load Recruiters Failed',
      text: err?.response?.data?.message || 'Error fetching recruiters',
    })
  }
}

const fetchJobTitles = async () => {
  try {
    const res = await api.get('/job-requisitions/job-titles', { params: { company } })
    jobTitles.value = res.data.jobTitles
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Load Job Titles Failed',
      text: err?.response?.data?.message || 'Error loading job titles',
    })
  }
}

const getTypeFromTab = (tab) => {
  if (tab === 'White Collar') return 'White Collar'
  return 'Blue Collar'
}

const getSubTypeFromTab = (tab) => {
  if (tab === 'Blue Collar Sewer') return 'Sewer'
  if (tab === 'Blue Collar Non-Sewer') return 'Non-Sewer'
  return undefined
}

const buildListParams = (extra = {}) => {
  return {
    page: 1,
    limit: PAGE_SIZE,
    company,
    type: getTypeFromTab(activeTab.value),
    subType: getSubTypeFromTab(activeTab.value),
    ...filters.value,
    ...extra,
  }
}

const matchesCurrentView = (job) => {
  if (!job) return false

  if (activeTab.value === 'White Collar' && job.type !== 'White Collar') return false
  if (activeTab.value === 'Blue Collar Sewer' && !(job.type === 'Blue Collar' && job.subType === 'Sewer')) return false
  if (
    activeTab.value === 'Blue Collar Non-Sewer' &&
    !(job.type === 'Blue Collar' && job.subType === 'Non-Sewer')
  ) return false

  if (filters.value.jobId &&
      !String(job.jobRequisitionId || '').toLowerCase().includes(filters.value.jobId.toLowerCase())) {
    return false
  }

  if (filters.value.department &&
      !String(job.departmentName || '').toLowerCase().includes(filters.value.department.toLowerCase())) {
    return false
  }

  if (filters.value.jobTitle &&
      !String(job.jobTitle || '').toLowerCase().includes(filters.value.jobTitle.toLowerCase())) {
    return false
  }

  if (filters.value.openingDate &&
      dayjs(job.openingDate).format('YYYY-MM-DD') !== filters.value.openingDate) {
    return false
  }

  if (filters.value.recruiter &&
      !String(job.recruiter || '').toLowerCase().includes(filters.value.recruiter.toLowerCase())) {
    return false
  }

  if (filters.value.status && job.status !== filters.value.status) {
    return false
  }

  if (filters.value.startDate &&
      dayjs(job.startDate).format('YYYY-MM-DD') !== filters.value.startDate) {
    return false
  }

  if (
    filters.value.hiringCost !== '' &&
    filters.value.hiringCost !== null &&
    filters.value.hiringCost !== undefined &&
    Number(job.hiringCost || 0) !== Number(filters.value.hiringCost)
  ) {
    return false
  }

  return true
}

const mergeUniqueRows = (existingRows, incomingRows) => {
  const seen = new Set(existingRows.map((row) => row._id))
  const appended = incomingRows.filter((row) => !seen.has(row._id))
  return [...existingRows, ...appended]
}

const ensureScrollableFill = async () => {
  await nextTick()

  const el = tableScrollRef.value
  if (!el || isInitialLoading.value || isFetchingMore.value || !hasMore.value) return

  const needsMore = el.scrollHeight <= el.clientHeight + 24
  if (needsMore) {
    await fetchRequisitions()
  }
}

const fetchRequisitions = async ({ reset = false } = {}) => {
  if (isInitialLoading.value || isFetchingMore.value) return
  if (!reset && !hasMore.value) return

  const pageToLoad = reset ? 1 : nextPage.value

  if (pageToLoad === 1) {
    isInitialLoading.value = true
  } else {
    isFetchingMore.value = true
  }

  let shouldCheckFill = false

  try {
    const res = await api.get('/job-requisitions', {
      params: buildListParams({
        page: pageToLoad,
        limit: PAGE_SIZE,
      }),
    })

    const incomingRows = Array.isArray(res.data?.requisitions) ? res.data.requisitions : []

    total.value = Number(res.data?.total || 0)
    hasMore.value = Boolean(res.data?.hasMore)

    if (reset) {
      requisitions.value = incomingRows
      nextPage.value = 2
      await nextTick()
      if (tableScrollRef.value) {
        tableScrollRef.value.scrollTop = 0
      }
    } else {
      requisitions.value = mergeUniqueRows(requisitions.value, incomingRows)
      nextPage.value = pageToLoad + 1
    }

    shouldCheckFill = true
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Fetch Requisitions Failed',
      text: err?.response?.data?.message || err.message,
    })
  } finally {
    if (pageToLoad === 1) {
      isInitialLoading.value = false
    } else {
      isFetchingMore.value = false
    }
  }

  if (shouldCheckFill) {
    await ensureScrollableFill()
  }
}

const resetAndFetchRequisitions = async () => {
  hasMore.value = true
  nextPage.value = 1
  await fetchRequisitions({ reset: true })
}

const fetchAllRequisitionsForExport = async () => {
  const res = await api.get('/job-requisitions', {
    params: buildListParams({
      exportAll: true,
    }),
  })

  return Array.isArray(res.data?.requisitions) ? res.data.requisitions : []
}

const handleTableScroll = (event) => {
  const el = event?.target
  if (!el || isInitialLoading.value || isFetchingMore.value || !hasMore.value) return

  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120
  if (nearBottom) {
    fetchRequisitions()
  }
}

const submitRequisition = async () => {
  try {
    const selectedJob = jobTitles.value.find(
      (j) => j.jobTitle.trim().toLowerCase() === form.value.jobTitle.trim().toLowerCase()
    )

    if (!selectedJob) {
      return Swal.fire({
        icon: 'warning',
        title: 'Invalid Job Title',
        text: 'Please select a valid job title from the dropdown list.',
      })
    }

    if (!selectedJob.type) {
      return Swal.fire({
        icon: 'error',
        title: 'Missing Job Type',
        text: 'Unable to determine job type. Please reselect the job title or contact admin.',
      })
    }

    const payload = {
      jobTitle: form.value.jobTitle,
      recruiter: form.value.recruiter,
      targetCandidates: form.value.targetCandidates || 1,
      openingDate: form.value.openingDate,
      hiringCost: form.value.hiringCost || 0,
      startDate: form.value.startDate || '',
      departmentId: selectedJob.departmentId,
      departmentName: selectedJob.departmentName,
      type: selectedJob.type,
      subType: selectedJob.type === 'Blue Collar' ? (selectedJob.subType || 'Non-Sewer') : undefined,
      status: 'Vacant',
    }

    await api.post(`/job-requisitions${company ? `?company=${company}` : ''}`, payload)

    alerts.value[getAlertKey(payload)] = true
    localStorage.setItem(`seen_${getAlertKey(payload)}`, 'false')

    await Swal.fire({
      icon: 'success',
      title: 'Created',
      text: 'Job requisition created successfully.',
    })

    form.value = {
      jobTitle: '',
      recruiter: '',
      targetCandidates: 1,
      openingDate: '',
      hiringCost: '',
      startDate: '',
      status: 'Vacant',
    }

    await resetAndFetchRequisitions()
  } catch (err) {
    const serverMessage = err?.response?.data?.message || 'Unknown error occurred.'
    Swal.fire({
      icon: 'error',
      title: 'Create Failed',
      html: `
        <strong>Reason:</strong> ${serverMessage}<br><br>
        <strong>Fix:</strong> Ensure all fields are selected correctly, especially job title and recruiter.
      `,
      confirmButtonText: 'OK',
      allowEnterKey: true,
    })
  }
}

const setActive = async (tab) => {
  activeTab.value = tab
  alerts.value[tab] = false
  localStorage.setItem(`seen_${tab}`, 'true')
  await resetAndFetchRequisitions()
}

const onJobTitleSelected = () => {
  const found = jobTitles.value.find((j) => j.jobTitle === form.value.jobTitle)
  if (found) {
    form.value.departmentId = found.departmentId
    form.value.departmentName = found.departmentName
    form.value.type = found.type
    form.value.subType = found.subType
  }
}

const formatDate = (val) => (val ? dayjs(val).format('DD-MMM-YY') : '-')
const formatCost = (val) => `${Number(val || 0).toFixed(2)}$`

const getStatusColor = (status) =>
  ({
    Vacant: 'blue',
    Filled: 'green',
    Suspended: 'orange',
    Cancel: 'red',
  }[status] || 'grey-lighten-3')

const getAlertKey = (entry) => {
  if (entry.type === 'White Collar') return 'White Collar'
  if (entry.type === 'Blue Collar' && entry.subType === 'Sewer') return 'Blue Collar Sewer'
  return 'Blue Collar Non-Sewer'
}

const editJob = (job) => {
  isEditing.value = true
  showCreateForm.value = true
  form.value = {
    jobTitle: job.jobTitle,
    recruiter: job.recruiter,
    targetCandidates: job.targetCandidates,
    openingDate: dayjs(job.openingDate).format('YYYY-MM-DD'),
    hiringCost: job.hiringCost,
    startDate: job.startDate ? dayjs(job.startDate).format('YYYY-MM-DD') : '',
    departmentId: job.departmentId,
    departmentName: job.departmentName,
    type: job.type,
    subType: job.subType,
    status: job.status,
  }
  editId.value = job._id
}

const updateRequisition = async () => {
  try {
    await api.put(`/job-requisitions/${editId.value}${company ? `?company=${company}` : ''}`, form.value)

    await Swal.fire({
      icon: 'success',
      title: 'Updated',
      text: 'Requisition updated',
    })

    isEditing.value = false
    showCreateForm.value = false
    form.value = {
      jobTitle: '',
      recruiter: '',
      targetCandidates: 1,
      openingDate: '',
      hiringCost: '',
      startDate: '',
      status: 'Vacant',
    }

    await resetAndFetchRequisitions()
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: err?.response?.data?.message || 'Error updating requisition',
    })
  }
}

const deleteJob = async (job) => {
  const confirm = await Swal.fire({
    icon: 'warning',
    title: 'Confirm Deletion',
    text: `Delete ${job.jobRequisitionId}?`,
    showCancelButton: true,
  })

  if (confirm.isConfirmed) {
    try {
      await api.delete(`/job-requisitions/${job._id}${company ? `?company=${company}` : ''}`)

      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Requisition deleted',
      })

      await resetAndFetchRequisitions()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err?.response?.data?.message || 'Error deleting requisition',
      })
    }
  }
}

const exportToExcel = async () => {
  isExporting.value = true

  try {
    const allJobs = await fetchAllRequisitionsForExport()

    const exportData = allJobs.map((job, index) => ({
      No: index + 1,
      'Job ID': job.jobRequisitionId,
      Department: job.departmentName,
      'Job Title': job.jobTitle,
      Recruiter: job.recruiter,
      'Opening Date': job.openingDate ? dayjs(job.openingDate).format('DD/MM/YYYY') : '',
      'Onboard Start Date': (job.latestOnboardDate || job.startDate)
        ? dayjs(job.latestOnboardDate || job.startDate).format('DD/MM/YYYY')
        : '',
      'Hiring Cost': job.hiringCost || '',
      Status: job.status,
      'Target Candidates': job.targetCandidates || '',
      'Offer Count': job.offerCount || 0,
      'Onboard Count': job.onboardCount || 0,
      'Time to Fill (days)': job.daysToFill ?? '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Requisitions')

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    saveAs(blob, `JobRequisitions_${dayjs().format('YYYY-MM-DD')}.xlsx`)
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Export Failed',
      text: err?.response?.data?.message || err.message || 'Failed to export Excel',
    })
  } finally {
    isExporting.value = false
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet)

    const validHeaders = ['Job Title', 'Recruiter', 'Target Candidates', 'Opening Date', 'Hiring Cost', 'Start Date']
    const missingHeaders = validHeaders.filter((header) => !Object.keys(json[0]).includes(header))

    if (missingHeaders.length > 0) {
      return Swal.fire({
        icon: 'error',
        title: 'Invalid Excel Format',
        text: 'Missing: ' + missingHeaders.join(', '),
      })
    }

    for (const row of json) {
      try {
        const jobTitleObj = jobTitles.value.find((j) => j.jobTitle === row['Job Title'])
        if (!jobTitleObj) continue

        const payload = {
          jobTitle: row['Job Title'],
          recruiter: row['Recruiter'],
          targetCandidates: row['Target Candidates'] || 1,
          openingDate: dayjs(row['Opening Date']).format('YYYY-MM-DD'),
          hiringCost: row['Hiring Cost'],
          startDate: row['Start Date'] ? dayjs(row['Start Date']).format('YYYY-MM-DD') : '',
          departmentId: jobTitleObj.departmentId,
          departmentName: jobTitleObj.departmentName,
          type: jobTitleObj.type,
          subType: jobTitleObj.subType,
          status: 'Vacant',
        }

        await api.post('/job-requisitions', payload)
      } catch (err) {
        console.error('❌ Failed to import row:', row, err)
      }
    }

    await Swal.fire({
      icon: 'success',
      title: 'Import Complete',
      text: 'All valid rows imported.',
    })

    await resetAndFetchRequisitions()
  }

  reader.readAsArrayBuffer(file)
}

watch(
  filters,
  () => {
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = setTimeout(() => {
      resetAndFetchRequisitions()
    }, 300)
  },
  { deep: true }
)

onMounted(async () => {
  Object.keys(alerts.value).forEach((key) => {
    alerts.value[key] = localStorage.getItem(`seen_${key}`) !== 'true'
  })

  await Promise.all([fetchJobTitles(), fetchRecruiters()])
  await resetAndFetchRequisitions()

  socket.on('jobAdded', async (newJob) => {
    if (!matchesCurrentView(newJob)) return

    total.value += 1

    if (nextPage.value === 2 && !requisitions.value.some((row) => row._id === newJob._id)) {
      requisitions.value = [newJob, ...requisitions.value]
    }
  })

  socket.on('jobDeleted', (deletedJobId) => {
    const beforeLength = requisitions.value.length
    requisitions.value = requisitions.value.filter((j) => j._id !== deletedJobId)

    if (requisitions.value.length !== beforeLength) {
      total.value = Math.max(0, total.value - 1)
    }
  })

  socket.on('jobUpdated', (updatedJob) => {
    const index = requisitions.value.findIndex((j) => j._id === updatedJob._id)
    if (index !== -1) {
      requisitions.value[index] = {
        ...requisitions.value[index],
        ...updatedJob,
      }
    }
  })

  socket.on('jobAvailabilityChanged', (availability) => {
    const index = requisitions.value.findIndex((j) => j._id === availability.jobId)
    if (index !== -1) {
      requisitions.value[index].offerCount = availability.offerCount
      requisitions.value[index].onboardCount = availability.onboardCount

      if (availability.onboardFull) requisitions.value[index].status = 'Filled'
      else if (availability.offerFull) requisitions.value[index].status = 'Suspended'
      else requisitions.value[index].status = 'Vacant'
    }
  })
})

onBeforeUnmount(() => {
  clearTimeout(filterDebounceTimer)
  socket.off('jobUpdated')
  socket.off('jobAvailabilityChanged')
  socket.off('jobAdded')
  socket.off('jobDeleted')
})
</script>

<style scoped>
.scroll-wrapper-x {
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;
  display: block;

  /* Responsive height: not too long, not too short */
  height: clamp(360px, calc(100vh - 310px), 540px);
  max-height: clamp(360px, calc(100vh - 310px), 540px);

  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}

.v-table tbody tr:hover {
  background-color: #e3f2fd;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.v-table td,
.v-table th {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 220px;
  padding: 10px 16px !important;
  vertical-align: middle !important;
  font-size: 13px;
}

/* ✅ Freeze Job Requisition table header like Candidate table */
.scroll-wrapper-x {
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;
  display: block;

  height: clamp(360px, calc(100vh - 310px), 540px);
  max-height: clamp(360px, calc(100vh - 310px), 540px);

  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  position: relative;
}

/* ✅ Important for Vuetify table inside scoped style */
.scroll-wrapper-x :deep(.v-table__wrapper) {
  overflow: visible !important;
}

.scroll-wrapper-x :deep(table) {
  border-collapse: separate;
  border-spacing: 0;
}

/* ✅ Sticky header */
.scroll-wrapper-x :deep(thead th) {
  position: sticky !important;
  top: 0 !important;
  z-index: 20 !important;
  background-color: #fafafa !important;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

/* ✅ Keep header above row hover/background */
.scroll-wrapper-x :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 21;
}

.hover-filled {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.hover-primary:hover {
  background-color: #1976d2 !important;
  color: white !important;
}

.hover-teal:hover {
  background-color: #00897b !important;
  color: white !important;
}

.hover-info:hover {
  background-color: #0288d1 !important;
  color: white !important;
}

.vacancy-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.vacancy-pill {
  position: relative;
  display: inline-grid;
  place-items: center;
  min-width: 58px;
  height: 34px;
  padding: 0 12px;
  box-sizing: border-box;
}

.vacancy-pill__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.vacancy-pill__track,
.vacancy-pill__progress {
  fill: none;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.vacancy-pill__track {
  stroke: #d9d9d9;
}

.vacancy-pill__progress {
  stroke: #32bd37;
  stroke-linecap: round;
  transition: stroke-dasharray 0.25s ease;
}

.vacancy-pill__text {
  position: relative;
  z-index: 1;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #7a7a7a;
}

.vacancy-pill__text.is-green {
  color: #47bb4d;
}

.action-col {
  text-align: center;
  vertical-align: middle !important;
}

.action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 100%;
}

.action-cell :deep(.v-btn) {
  flex: 0 0 auto;
}

.list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.list-footer__summary,
.list-footer__status {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.62);
}

.empty-row {
  padding: 24px !important;
  color: rgba(0, 0, 0, 0.56);
}
</style>