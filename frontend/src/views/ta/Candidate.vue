<!-- views/ta/Candidate.vue -->

<template>
  <v-container fluid>
    <v-card class="pa-4">
      <!-- Tabs -->
      <v-row class="mb-4">
        <v-col
          v-for="tab in ['White Collar', 'Blue Collar Sewer', 'Blue Collar Non-Sewer']"
          :key="tab"
          cols="auto"
        >
          <v-btn
            @click="setActive(tab)"
            :color="activeTab === tab ? 'primary' : ''"
          >
            {{ tab }}
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
            @click="toggleForm"
          >
            {{ showForm ? 'Close Form' : 'Add Candidate' }}
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
            {{ showFilterForm ? 'Close Filter Form' : 'Filter Candidates' }}
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn
            color="green"
            variant="outlined"
            autocomplete="off"
            class="text-white font-weight-bold hover-filled hover-excel"
            elevation="0"
            :loading="isExporting"
            @click="exportToExcel"
          >
            <v-icon start>mdi-file-excel</v-icon>
            Export Excel
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <input
            ref="excelInput"
            type="file"
            accept=".xlsx, .xls"
            @change="handleImportExcel"
            style="display: none"
          />
        </v-col>
      </v-row>

      <!-- Candidate Form -->
      <v-form
        v-if="showForm"
        ref="formSection"
        @submit.prevent="submitCandidate"
      >
        <v-row dense>
          <v-col cols="12" md="3">
            <v-autocomplete
              v-if="!isEditMode"
              v-model="selectedRequisition"
              :items="filteredJobTitleOptions"
              :item-title="item => `${item.jobRequisitionId} - ${item.jobTitle}`"
              item-value="_id"
              label="Job Title"
              variant="outlined"
              density="compact"
              return-object
              auto-select-first
              required
            />

            <v-text-field
              v-else
              :model-value="`${form.jobRequisitionCode} - ${form.jobTitle || ''}`"
              label="Job Title"
              variant="outlined"
              density="compact"
              readonly
              disabled
            />
          </v-col>

          <v-col cols="12" md="2">
            <v-text-field
              v-model="form.fullName"
              label="Candidate Name"
              required
              variant="outlined"
              autocomplete="off"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="2">
            <v-autocomplete
              v-model="form.applicationSource"
              :items="applicationSources"
              label="Application Source"
              clearable
              variant="outlined"
              autocomplete="off"
              density="compact"
              hide-details
              auto-select-first
            />
          </v-col>

          <v-col cols="12" md="3" v-if="isEditMode">
            <v-autocomplete
              v-model="form.hireDecision"
              :items="hireDecisionOptions"
              label="Final Decision"
              clearable
              variant="outlined"
              autocomplete="off"
              density="compact"
              hide-details
              auto-select-first
              required
            />
          </v-col>

          <v-col cols="12" md="2">
            <v-btn
              color="success"
              type="submit"
              variant="outlined"
              autocomplete="off"
              density="compact"
              style="height: 40px"
              block
            >
              {{ isEditMode ? 'Update Candidate' : 'Submit' }}
            </v-btn>
          </v-col>
        </v-row>
      </v-form>

      <!-- Filter Form -->
      <v-row v-if="showFilterForm" class="mb-4" dense>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.candidateId"
            label="Candidate ID"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.jobId"
            label="Job ID"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.department"
            label="Department"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.jobTitle"
            label="Job Title"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.recruiter"
            label="Recruiter"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.fullName"
            label="Candidate Name"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-select
            v-model="filters.applicationSource"
            :items="applicationSources"
            label="Application Source"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-select
            v-model="filters.hireDecision"
            :items="hireDecisionOptions"
            label="Final Decision"
            variant="outlined"
            autocomplete="off"
            clearable
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <!-- Candidate Table -->
      <div
        ref="tableScrollRef"
        class="table-wrapper"
        @scroll.passive="handleTableScroll"
      >
        <table class="native-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Candidate ID</th>
              <th>Job ID</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Recruiter</th>
              <th>Candidate Name</th>
              <th>Source</th>
              <th>Application</th>
              <th>Sent to Manager</th>
              <th>Interview</th>
              <th>JobOffer</th>
              <th>Hired</th>
              <th>Onboard</th>
              <th>Final Decision</th>
              <th>Start Duration</th>
              <th class="text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(c, index) in candidates" :key="c._id">
              <td>{{ index + 1 }}</td>
              <td>{{ c.candidateId }}</td>
              <td>{{ c.jobRequisitionCode }}</td>
              <td>{{ c.department }}</td>
              <td>{{ c.jobTitle }}</td>
              <td>{{ c.recruiter }}</td>
              <td>{{ c.fullName }}</td>
              <td>{{ c.applicationSource }}</td>

              <td
                v-for="stage in stageKeys"
                :key="stage"
              >
                <v-btn
                  :class="[getStageClass(c.progressDates?.[stage]), isAllStagesBlocked(c) ? 'disabled-btn' : '']"
                  :disabled="isAllStagesBlocked(c)"
                  @click="!isAllStagesBlocked(c) && openStagePopup(stage, c)"
                >
                  {{ formatDate(c.progressDates?.[stage]) }}
                </v-btn>
              </td>

              <td>{{ c.hireDecision || '-' }}</td>

              <td>
                <span v-if="c.progressDates?.Application && c.progressDates?.Onboard">
                  {{ daysBetween(c.progressDates.Onboard, c.progressDates.Application) }} days
                </span>
                <span v-else>-</span>
              </td>

              <td class="action-col">
                <div class="action-cell">
                  <v-btn
                    icon
                    size="small"
                    color="primary"
                    @click="startEdit(c)"
                  >
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>

                  <v-btn
                    icon
                    size="small"
                    color="error"
                    @click="confirmDelete(c)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>

            <tr v-if="!isInitialLoading && !candidates.length">
              <td colspan="17" class="empty-row text-center">
                No candidates found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <v-row class="mt-4 d-flex align-center" justify="space-between">
        <v-col cols="12">
          <div class="list-footer">
            <div class="list-footer__summary">
              Showing <strong>{{ candidates.length }}</strong>/<strong>{{ totalCandidates }}</strong>
            </div>

            <div v-if="isFetchingMore" class="list-footer__status">
              Loading more...
            </div>

            <div v-else-if="!hasMore && candidates.length" class="list-footer__status">
              All rows loaded
            </div>
          </div>
        </v-col>

        <v-overlay
          :model-value="isInitialLoading"
          class="align-center justify-center"
          persistent
        >
          <v-progress-circular
            indeterminate
            :size="72"
            :width="6"
            color="teal"
          />
        </v-overlay>
      </v-row>

      <!-- Stage Popup -->
      <v-dialog v-model="dateMenu" persistent max-width="360">
        <v-card>
          <v-card-title class="text-h6">
            Select {{ selectedStage }} Date
          </v-card-title>

          <v-card-text>
            <v-date-picker
              v-model="dateModel"
              color="primary"
              show-adjacent-months
            />
          </v-card-text>

          <v-card-actions>
            <v-btn color="primary" @click="updateProgressStage">
              Save
            </v-btn>

            <v-spacer />

            <v-btn color="grey" @click="dateMenu = false">
              Cancel
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, nextTick, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import socket from '@/utils/socket'
import readXlsxFile from 'read-excel-file'

const PAGE_SIZE = 20

const activeTab = ref('White Collar')
const showForm = ref(false)
const showFilterForm = ref(false)
const candidates = ref([])
const jobRequisitions = ref([])
const selectedRequisition = ref(null)
const isEditMode = ref(false)
const editId = ref(null)
const socketListenerAdded = ref(false)
const totalCandidates = ref(0)
const formSection = ref(null)
const jobTitleOptions = ref([])
const tableScrollRef = ref(null)

const nextPage = ref(1)
const hasMore = ref(true)
const isInitialLoading = ref(false)
const isFetchingMore = ref(false)
const isExporting = ref(false)

const dateMenu = ref(false)
const selectedStage = ref('')
const selectedCandidate = ref(null)
const dateModel = ref('')
const jobLockedMap = ref({})

let filterDebounceTimer = null

const stageKeys = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard']

const applicationSources = [
  'Agency',
  'Banner / Job Announcement Board',
  'Brochure',
  'FIF',
  'Facebook',
  'HR Call',
  'Job Portal',
  'LinkedIn',
  'Telegram',
  'Other',
]

const hireDecisionOptions = [
  'Candidate in Process',
  'Candidate Refusal',
  'Not Hired',
]

const form = ref({
  fullName: '',
  applicationSource: '',
  department: '',
  recruiter: '',
  jobRequisitionCode: '',
  jobTitle: '',
  type: '',
  subType: '',
  hireDecision: 'Candidate in Process',
})

const filters = ref({
  candidateId: '',
  jobId: '',
  jobTitle: '',
  department: '',
  recruiter: '',
  fullName: '',
  applicationSource: '',
  hireDecision: '',
})

const getCurrentCompany = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const selectedCompany = localStorage.getItem('company')

  return user?.role === 'GeneralManager'
    ? selectedCompany
    : user?.company
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

const buildCandidateParams = (extra = {}) => {
  const company = getCurrentCompany()

  return {
    page: 1,
    limit: PAGE_SIZE,
    company,
    ...filters.value,
    type: getTypeFromTab(activeTab.value),
    subType: getSubTypeFromTab(activeTab.value),
    ...extra,
  }
}

const normalizeId = (value) => {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || '')
  return String(value)
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
    await fetchCandidates()
  }
}

const fetchCandidates = async ({ reset = false } = {}) => {
  if (isInitialLoading.value || isFetchingMore.value) return
  if (!reset && !hasMore.value) return

  const company = getCurrentCompany()

  if (!company) {
    Swal.fire({
      icon: 'error',
      title: 'Missing Company',
      text: 'Company not found',
    })
    return
  }

  const pageToLoad = reset ? 1 : nextPage.value

  if (pageToLoad === 1) {
    isInitialLoading.value = true
  } else {
    isFetchingMore.value = true
  }

  let shouldCheckFill = false

  try {
    const res = await axios.get('/candidates', {
      params: buildCandidateParams({
        page: pageToLoad,
        limit: PAGE_SIZE,
      }),
    })

    const incomingRows = Array.isArray(res.data?.candidates)
      ? res.data.candidates
      : []

    totalCandidates.value = Number(res.data?.total || 0)
    hasMore.value = Boolean(res.data?.hasMore)

    if (reset) {
      candidates.value = incomingRows
      nextPage.value = 2

      await nextTick()

      if (tableScrollRef.value) {
        tableScrollRef.value.scrollTop = 0
      }
    } else {
      candidates.value = mergeUniqueRows(candidates.value, incomingRows)
      nextPage.value = pageToLoad + 1
    }

    updateJobLockedMap()
    shouldCheckFill = true
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Fetch Error',
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

const resetAndFetchCandidates = async () => {
  hasMore.value = true
  nextPage.value = 1
  await fetchCandidates({ reset: true })
}

const fetchAllCandidatesForExport = async () => {
  const company = getCurrentCompany()

  if (!company) {
    throw new Error('Company not found')
  }

  const res = await axios.get('/candidates', {
    params: buildCandidateParams({
      exportAll: true,
    }),
  })

  return Array.isArray(res.data?.candidates)
    ? res.data.candidates
    : []
}

const handleTableScroll = (event) => {
  const el = event?.target
  if (!el || isInitialLoading.value || isFetchingMore.value || !hasMore.value) return

  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120
  if (nearBottom) {
    fetchCandidates()
  }
}

// === Stage Control ===
const openStagePopup = (stage, candidate) => {
  selectedStage.value = stage
  selectedCandidate.value = candidate

  const rawDate = candidate.progressDates?.[stage]
  const parsed = dayjs(rawDate)

  dateModel.value = parsed.isValid()
    ? parsed.format('YYYY-MM-DD')
    : dayjs().format('YYYY-MM-DD')

  dateMenu.value = true
}

const updateProgressStage = async () => {
  try {
    await axios.put(`/candidates/${selectedCandidate.value._id}/stage`, {
      stage: selectedStage.value,
      date: dateModel.value,
    })

    Swal.fire({
      icon: 'success',
      title: `${selectedStage.value} Updated ✅`,
    })

    await resetAndFetchCandidates()
    updateJobLockedMap()
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Failed to update stage',
      text: err.response?.data?.message || 'Unknown error',
    })
  } finally {
    dateMenu.value = false
  }
}

const isAllStagesBlocked = (candidate) => {
  const status = candidate.jobRequisitionId?.status

  if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) {
    return true
  }

  if (status === 'Cancel') {
    return true
  }

  const jobId = normalizeId(candidate.jobRequisitionId)
  const allowedIds = jobLockedMap.value[jobId]

  if (!allowedIds) return false

  return !allowedIds.includes(candidate._id)
}

const updateJobLockedMap = () => {
  jobLockedMap.value = {}

  const grouped = {}

  for (const c of candidates.value) {
    const jobId = normalizeId(c.jobRequisitionId)

    if (!jobId) continue

    if (!grouped[jobId]) {
      grouped[jobId] = []
    }

    grouped[jobId].push(c)
  }

  for (const jobId in grouped) {
    const group = grouped[jobId]

    const target =
      jobRequisitions.value.find((j) => String(j._id) === String(jobId))?.targetCandidates || 0

    const validOffers = group.filter((c) =>
      ['JobOffer', 'Hired', 'Onboard'].includes(c.progress) &&
      !['Candidate Refusal', 'Not Hired'].includes(c.hireDecision)
    )

    if (target && validOffers.length >= target) {
      jobLockedMap.value[jobId] = validOffers.map((c) => c._id)
    }
  }
}

// === Form Logic ===
const toggleForm = () => {
  showForm.value = !showForm.value
  if (!showForm.value) resetForm()
}

const resetForm = () => {
  isEditMode.value = false
  editId.value = null
  selectedRequisition.value = null

  form.value = {
    fullName: '',
    applicationSource: '',
    department: '',
    recruiter: '',
    jobRequisitionCode: '',
    jobTitle: '',
    type: '',
    subType: '',
    hireDecision: 'Candidate in Process',
  }
}

const startEdit = (candidate) => {
  showForm.value = true
  isEditMode.value = true
  editId.value = candidate._id

  form.value = {
    fullName: candidate.fullName,
    applicationSource: candidate.applicationSource,
    department: candidate.department,
    recruiter: candidate.recruiter,
    jobRequisitionCode: candidate.jobRequisitionCode,
    jobTitle: candidate.jobTitle,
    type: candidate.type,
    subType: candidate.subType,
    hireDecision: candidate.hireDecision || 'Candidate in Process',
  }

  selectedRequisition.value = null

  nextTick(() => {
    const formEl = formSection.value?.$el || formSection.value
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const submitCandidate = async () => {
  const company = getCurrentCompany()

  if (!company) {
    Swal.fire({
      icon: 'error',
      title: 'Missing Company',
      text: 'Company not found in localStorage',
    })
    return
  }

  let payload

  if (isEditMode.value && editId.value) {
    payload = {
      fullName: form.value.fullName,
      recruiter: form.value.recruiter,
      applicationSource: form.value.applicationSource,
      hireDecision: form.value.hireDecision,
    }
  } else {
    if (!selectedRequisition.value) {
      Swal.fire({
        icon: 'error',
        title: 'Please select a job title',
      })
      return
    }

    const job = selectedRequisition.value

    payload = {
      jobRequisitionId: job._id,
      jobRequisitionCode: job.jobRequisitionId,
      department: job.departmentName,
      jobTitle: job.jobTitle,
      recruiter: job.recruiter,
      type: job.type,
      subType: job.subType || 'General',
      fullName: form.value.fullName,
      applicationSource: form.value.applicationSource,
      company,
      hireDecision: 'Candidate in Process',
    }
  }

  try {
    if (isEditMode.value && editId.value) {
      await axios.put(`/candidates/${editId.value}`, payload)

      Swal.fire({
        icon: 'success',
        title: 'Candidate Updated ✅',
        allowEnterKey: true,
      })
    } else {
      await axios.post('/candidates', payload)

      Swal.fire({
        icon: 'success',
        title: 'Candidate Created ✅',
        allowEnterKey: true,
      })
    }

    await resetAndFetchCandidates()
    updateJobLockedMap()
    toggleForm()
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err.response?.data?.message || 'Failed to save candidate',
    })
  }
}

const confirmDelete = async (candidate) => {
  const result = await Swal.fire({
    icon: 'warning',
    title: `Delete ${candidate.fullName}?`,
    text: `Are you sure you want to delete candidate ${candidate.candidateId}?`,
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#aaa',
    confirmButtonText: 'Yes, delete it!',
    allowEnterKey: true,
  })

  if (!result.isConfirmed) return

  try {
    await axios.delete(`/candidates/${candidate._id}`)

    Swal.fire({
      icon: 'success',
      title: 'Deleted ✅',
      text: 'Candidate deleted successfully',
    })

    await resetAndFetchCandidates()
    updateJobLockedMap()
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Delete failed',
      text: err.response?.data?.message || 'Unknown error',
    })
  }
}

const getStageClass = (date) => {
  return date ? 'stage-btn green-btn' : 'stage-btn red-btn'
}

// UI/table display format: 24-Apr-26
const formatDate = (val) => {
  return val ? dayjs(val).format('DD-MMM-YY') : '-'
}

// Excel export date format: 24/04/2026
const formatExcelDate = (val) => {
  return val ? dayjs(val).format('DD/MM/YYYY') : ''
}

const daysBetween = (end, start) => {
  return dayjs(end).diff(dayjs(start), 'day')
}

const fetchJobRequisitions = async (includeAll = false) => {
  try {
    const type = getTypeFromTab(activeTab.value)
    const subType = getSubTypeFromTab(activeTab.value)

    const params = new URLSearchParams()
    params.append('type', type)

    if (subType) {
      params.append('subType', subType)
    }

    if (includeAll) {
      params.append('all', 'true')
    }

    const res = await axios.get(`/job-requisitions/vacant?${params.toString()}`)

    jobRequisitions.value = res.data || []

    const titles = [...new Set(jobRequisitions.value.map((j) => j.jobTitle))]
      .filter(Boolean)

    jobTitleOptions.value = titles
  } catch (error) {
    console.error('Error fetching requisitions:', error)

    Swal.fire({
      icon: 'error',
      title: 'Failed to load job requisitions',
      text: error.response?.data?.message || error.message,
    })
  }
}

// === UI & Filters ===
const setActive = async (tab) => {
  activeTab.value = tab
}

const filteredJobTitleOptions = computed(() => {
  const isWhite = (j) =>
    activeTab.value === 'White Collar' &&
    j.type === 'White Collar'

  const isSewer = (j) =>
    activeTab.value === 'Blue Collar Sewer' &&
    j.type === 'Blue Collar' &&
    j.subType === 'Sewer'

  const isNonSewer = (j) =>
    activeTab.value === 'Blue Collar Non-Sewer' &&
    j.type === 'Blue Collar' &&
    j.subType === 'Non-Sewer'

  return jobRequisitions.value.filter((j) => {
    if (showForm.value && j.status !== 'Vacant') return false
    return isWhite(j) || isSewer(j) || isNonSewer(j)
  })
})

const exportToExcel = async () => {
  isExporting.value = true

  try {
    const allCandidates = await fetchAllCandidatesForExport()

    const data = allCandidates.map((c, index) => ({
      No: index + 1,
      CandidateID: c.candidateId,
      JobID: c.jobRequisitionCode,
      Department: c.department,
      JobTitle: c.jobTitle,
      Recruiter: c.recruiter,
      FullName: c.fullName,
      Source: c.applicationSource,

      // Excel dates: 24/04/2026
      Application: formatExcelDate(c.progressDates?.Application),
      ManagerReview: formatExcelDate(c.progressDates?.ManagerReview),
      Interview: formatExcelDate(c.progressDates?.Interview),
      JobOffer: formatExcelDate(c.progressDates?.JobOffer),
      Hired: formatExcelDate(c.progressDates?.Hired),
      Onboard: formatExcelDate(c.progressDates?.Onboard),

      FinalDecision: c.hireDecision || '',
      StartDuration:
        c.progressDates?.Application && c.progressDates?.Onboard
          ? `${daysBetween(c.progressDates.Onboard, c.progressDates.Application)} days`
          : '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates')

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream',
    })

    saveAs(blob, `Candidates_${dayjs().format('YYYY-MM-DD')}.xlsx`)
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

const handleImportExcel = async (event) => {
  try {
    const file = event.target.files[0]
    if (!file) return

    await fetchJobRequisitions(true)

    const data = await readXlsxFile(file)
    const headers = data[0]
    const rows = data.slice(1)

    const requiredHeaders = ['FullName', 'JobTitle', 'Recruiter', 'Source']
    const isValid = requiredHeaders.every((h) => headers.includes(h))

    if (!isValid) {
      Swal.fire(
        '❌ Invalid Format',
        'Excel must contain headers: FullName, JobTitle, Recruiter, Source',
        'error'
      )
      return
    }

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      const rowData = Object.fromEntries(headers.map((h, i) => [h, row[i]]))

      const jobTitle = rowData.JobTitle

      const matchedRequisitions = jobRequisitions.value
        .filter((jr) => jr.jobTitle === jobTitle && jr.status === 'Vacant')
        .sort((a, b) => (a.offerCount || 0) - (b.offerCount || 0))

      if (!matchedRequisitions.length) {
        skipped++
        console.warn(`⚠️ No vacant job requisition for title: ${jobTitle}`)
        continue
      }

      const bestMatch = matchedRequisitions[0]
      const target = bestMatch.targetCandidates || 0
      const currentOffer = bestMatch.offerCount || 0

      if (currentOffer >= target) {
        skipped++
        console.warn(`⛔ Offer full for: ${jobTitle}`)
        continue
      }

      const payload = {
        fullName: rowData.FullName || '',
        recruiter: rowData.Recruiter || '',
        applicationSource: rowData.Source || '',
        jobRequisitionId: bestMatch._id,
        jobRequisitionCode: bestMatch.jobRequisitionId,
        company: bestMatch.company,
        department: bestMatch.departmentName,
        jobTitle: bestMatch.jobTitle,
        type: bestMatch.type,
        subType: bestMatch.subType || 'General',
        progressDates: {
          Application: new Date().toISOString(),
        },
        hireDecision: 'Candidate in Process',
      }

      try {
        await axios.post('/candidates', payload)
        imported++
      } catch (err) {
        console.error('❌ Import error for candidate:', rowData.FullName, err)
        skipped++
      }
    }

    Swal.fire({
      icon: 'success',
      title: '✅ Import Complete',
      html: `Imported: <b>${imported}</b><br>Skipped: <b>${skipped}</b>`,
      allowEnterKey: true,
    })

    await resetAndFetchCandidates()
    await fetchJobRequisitions(true)
  } catch (err) {
    console.error('❌ Excel Import Error:', err)
    Swal.fire('Import Failed', err.message, 'error')
  } finally {
    event.target.value = null
  }
}

const setupSocketListeners = () => {
  if (socketListenerAdded.value) return

  socket.on('candidateAdded', async (candidate) => {
    console.log('📥 Candidate added via WebSocket:', candidate)

    totalCandidates.value += 1

    if (nextPage.value === 2 && !candidates.value.some((row) => row._id === candidate._id)) {
      candidates.value = [candidate, ...candidates.value]

      if (candidates.value.length > PAGE_SIZE) {
        candidates.value.pop()
      }
    }
  })

  socket.on('candidateUpdated', (updated) => {
    console.log('📥 Candidate updated via WebSocket:', updated)

    const idx = candidates.value.findIndex((c) => c._id === updated._id)

    if (idx !== -1) {
      candidates.value[idx] = {
        ...candidates.value[idx],
        ...updated,
      }
    }
  })

  socket.on('candidateDeleted', (deletedId) => {
    console.log('📥 Candidate deleted via WebSocket:', deletedId)

    const beforeLength = candidates.value.length

    candidates.value = candidates.value.filter((c) => c._id !== deletedId)

    if (candidates.value.length !== beforeLength) {
      totalCandidates.value = Math.max(0, totalCandidates.value - 1)
    }
  })

  socket.on('jobUpdated', (updatedJob) => {
    console.log('📥 Job updated via WebSocket:', updatedJob)

    const idx = jobRequisitions.value.findIndex((j) => j._id === updatedJob._id)

    if (idx !== -1) {
      jobRequisitions.value[idx] = updatedJob
    }
  })

  socket.on('jobAvailabilityChanged', (availability) => {
    console.log('📥 Job availability changed via WebSocket:', availability)

    const idx = jobRequisitions.value.findIndex((j) => j._id === availability.jobId)

    if (idx !== -1) {
      jobRequisitions.value[idx].offerFull = availability.offerFull
      jobRequisitions.value[idx].onboardFull = availability.onboardFull
      jobRequisitions.value[idx].offerCount = availability.offerCount
      jobRequisitions.value[idx].onboardCount = availability.onboardCount
    }
  })

  socketListenerAdded.value = true
}

const joinCurrentSocketRoom = () => {
  const tabToRoom = {
    'White Collar': 'white-collar',
    'Blue Collar Sewer': 'blue-collar-sewer',
    'Blue Collar Non-Sewer': 'blue-collar-nonsewer',
  }

  socket.emit('join-room', tabToRoom[activeTab.value])
  console.log('✅ Joined socket room:', tabToRoom[activeTab.value])
}

watch(
  filters,
  () => {
    clearTimeout(filterDebounceTimer)

    filterDebounceTimer = setTimeout(() => {
      resetAndFetchCandidates()
    }, 300)
  },
  { deep: true }
)

watch(activeTab, async () => {
  await fetchJobRequisitions(true)
  await resetAndFetchCandidates()
  joinCurrentSocketRoom()
})

onMounted(async () => {
  await fetchJobRequisitions(true)
  await resetAndFetchCandidates()

  joinCurrentSocketRoom()
  setupSocketListeners()
})

onBeforeUnmount(() => {
  clearTimeout(filterDebounceTimer)

  socket.off('candidateAdded')
  socket.off('candidateUpdated')
  socket.off('candidateDeleted')
  socket.off('jobUpdated')
  socket.off('jobAvailabilityChanged')

  socketListenerAdded.value = false
})
</script>

<style scoped>
.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;
  display: block;

  /* Same style as Job Requisition: responsive height */
  height: clamp(360px, calc(100vh - 310px), 540px);
  max-height: clamp(360px, calc(100vh - 310px), 540px);

  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  margin-top: 16px;
}

.native-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: auto;
}

.native-table th {
  position: sticky;
  top: 0;
  background: #fafafa;
  z-index: 10;
  font-weight: 500;
  padding: 8px 14px;
  white-space: nowrap;
  border-bottom: 1px solid #ccc;
  text-align: left;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.native-table td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  padding: 8px 14px;
  height: 52px;
  font-weight: 400;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

.native-table tbody tr:hover {
  background-color: #e3f2fd;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

/* Stage Button Styles */
.stage-btn {
  font-size: 11px;
  padding: 0 8px;
  min-width: 85px;
  height: 30px;
  color: white !important;
  text-transform: none;
  font-weight: 500;
  border-radius: 4px;
}

.green-btn {
  background-color: #4caf50 !important;
}

.red-btn {
  background-color: #d9534f !important;
}

.disabled-btn {
  background-color: #9e9e9e !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  opacity: 0.7;
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

/* Footer */
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

/* Buttons */
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

.hover-excel:hover {
  background-color: #43a047 !important;
  color: white !important;
}
</style>