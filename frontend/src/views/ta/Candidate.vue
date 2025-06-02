<template>
  <v-container fluid>
    <v-card class="pa-4">
      <!-- Tabs -->
      <v-row class="mb-4">
        <v-col cols="auto" v-for="tab in ['White Collar', 'Blue Collar Sewer', 'Blue Collar Non-Sewer']" :key="tab">
          <v-btn @click="setActive(tab)" :color="activeTab === tab ? 'primary' : ''">{{ tab }}</v-btn>
        </v-col>
      </v-row>

      <!-- Toggle Form -->
      <v-btn class="mb-4" color="primary" @click="toggleForm">
        {{ showForm ? 'Close Form' : 'Add Candidate' }}
      </v-btn>

      <!-- Candidate Form -->
      <v-form v-if="showForm" @submit.prevent="submitCandidate">
        <v-row dense>
          <v-col cols="12" md="3">
            <v-autocomplete
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
              :disabled="isEditMode"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="form.fullName" label="Candidate Name" required variant="outlined" />
          </v-col>
          <v-col cols="12" md="3">
            <v-autocomplete
              v-model="form.applicationSource"
              :items="['LinkedIn', 'Facebook', 'Website', 'Referral', 'Agency']"
              label="Application Source"
              clearable
              variant="outlined"
              density="compact"
              hide-details
              auto-select-first
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn color="success" type="submit" class="mt-2" block>
              {{ isEditMode ? 'Update Candidate' : 'Submit' }}
            </v-btn>
          </v-col>

          <!-- Only in Edit Mode -->
          <template v-if="isEditMode">
            <v-col cols="12" md="3" v-for="field in ['department', 'recruiter', 'jobRequisitionCode', 'type', 'subType']" :key="field">
              <v-text-field :label="field" :value="form[field]" variant="outlined" disabled />
            </v-col>
            <v-col cols="12" md="3">
              <v-autocomplete
                v-model="form.hireDecision"
                :items="['Candidate in Process', 'Candidate Refusal', 'Not Hired']"
                label="Final Decision"
                clearable
                variant="outlined"
                density="compact"
                hide-details
                auto-select-first
                required
              />
            </v-col>
          </template>
        </v-row>
      </v-form>

      <v-divider class="my-4" />

      <!-- Candidate Table -->
      <div class="table-wrapper">
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
              <th v-for="stage in ['Application','ManagerReview','Interview','JobOffer','Hired','Onboard']" :key="stage">{{ stage }}</th>
              <th>Final Decision</th>
              <th>Start Duration</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, index) in paginatedCandidates" :key="c._id">
              <td>{{ (candidatePage - 1) * candidatePerPage + index + 1 }}</td>
              <td>{{ c.candidateId }}</td>
              <td>{{ c.jobRequisitionCode }}</td>
              <td>{{ c.department }}</td>
              <td>{{ c.jobTitle }}</td>
              <td>{{ c.recruiter }}</td>
              <td>{{ c.fullName }}</td>
              <td>{{ c.applicationSource }}</td>
              <td v-for="stage in ['Application','ManagerReview','Interview','JobOffer','Hired','Onboard']" :key="stage">
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
              <td>
                <v-btn color="warning" size="small" @click="startEdit(c)">Edit</v-btn>
                <v-btn color="error" size="small" @click="confirmDelete(c)">Delete</v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <v-row class="mt-4 d-flex align-center" justify="space-between">
        <v-col cols="12" md="6" class="d-flex align-center">
          <v-pagination
            v-model="candidatePage"
            :length="Math.ceil(filteredCandidates.length / candidatePerPage)"
            total-visible="7"
            class="flex"
          />
        </v-col>

        <v-col cols="12" md="3" class="d-flex justify-end">
          <v-select
            v-model="candidatePerPage"
            :items="[25, 50, 100]"
            label="Rows per page"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 180px"
          />
        </v-col>
      </v-row>

      <!-- Stage Popup -->
      <v-dialog v-model="dateMenu" persistent max-width="360">
        <v-card>
          <v-card-title class="text-h6">Select {{ selectedStage }} Date</v-card-title>
          <v-card-text>
            <v-date-picker v-model="dateModel" color="primary" show-adjacent-months />
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="updateProgressStage">Save</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="grey" @click="dateMenu = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const activeTab = ref('White Collar')
const showForm = ref(false)
const candidates = ref([])
const jobRequisitions = ref([])
const selectedRequisition = ref(null)
const isEditMode = ref(false)
const editId = ref(null)

// ================= Paginationc========================
const candidatePage = ref(1)
const candidatePerPage = ref(25)

const paginatedCandidates = computed(() => {
  const start = (candidatePage.value - 1) * candidatePerPage.value
  const end = start + candidatePerPage.value
  return filteredCandidates.value.slice(start, end)
})





const form = ref({
  fullName: '',
  applicationSource: '',
  department: '',
  recruiter: '',
  jobRequisitionCode: '',
  type: '',
  subType: '',
  hireDecision: 'Candidate in Process'
})

const dateMenu = ref(false)
const selectedStage = ref('')
const selectedCandidate = ref(null)
const dateModel = ref('')
const jobLockedMap = ref({})

// === Stage Control ===
const openStagePopup = (stage, candidate) => {
  selectedStage.value = stage
  selectedCandidate.value = candidate
  dateModel.value = dayjs(candidate.progressDates?.[stage]).format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
  dateMenu.value = true
}

const updateProgressStage = async () => {
  try {
    await axios.put(`/candidates/${selectedCandidate.value._id}/stage`, {
      stage: selectedStage.value,
      date: dateModel.value
    })

    Swal.fire({ icon: 'success', title: `${selectedStage.value} Updated ✅` })
    await fetchCandidates()
    updateJobLockedMap()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Failed to update stage', text: err.response?.data?.message || 'Unknown error' })
  } finally {
    dateMenu.value = false
  }
}

const isAllStagesBlocked = (candidate) => {
  const status = candidate.jobRequisitionId?.status
  if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) return true
  if (status === 'Cancel') return true

  const jobId = candidate.jobRequisitionId?._id || candidate.jobRequisitionId
  const allowedIds = jobLockedMap.value[jobId]
  if (!allowedIds) return false

  return !allowedIds.includes(candidate._id)
}

const updateJobLockedMap = () => {
  jobLockedMap.value = {}

  const grouped = {}
  for (const c of candidates.value) {
    const jobId = c.jobRequisitionId
    if (!grouped[jobId]) grouped[jobId] = []
    grouped[jobId].push(c)
  }

  for (const jobId in grouped) {
    const group = grouped[jobId]
    const target = jobRequisitions.value.find(j => j._id === jobId)?.targetCandidates || 0

    const validOffers = group.filter(c =>
      ['JobOffer', 'Hired', 'Onboard'].includes(c.progress) &&
      !['Candidate Refusal', 'Not Hired'].includes(c.hireDecision)
    )

    if (validOffers.length >= target) {
      jobLockedMap.value[jobId] = validOffers.map(c => c._id)
    }
  }
}

const getStageClass = (date) => {
  return date ? 'stage-btn green-btn' : 'stage-btn red-btn'
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
    type: '',
    subType: '',
    hireDecision: 'Candidate in Process'
  }
}

const startEdit = (candidate) => {
  showForm.value = true
  isEditMode.value = true
  editId.value = candidate._id

  selectedRequisition.value = jobRequisitions.value.find(j => j.jobRequisitionId === candidate.jobRequisitionCode)

  form.value.fullName = candidate.fullName
  form.value.applicationSource = candidate.applicationSource
  form.value.department = candidate.department
  form.value.recruiter = candidate.recruiter
  form.value.jobRequisitionCode = candidate.jobRequisitionCode
  form.value.type = candidate.type
  form.value.subType = candidate.subType
  form.value.hireDecision = candidate.hireDecision || 'Candidate in Process'
}

const submitCandidate = async () => {
  if (!selectedRequisition.value) {
    Swal.fire({ icon: 'error', title: 'Please select a job title' })
    return
  }

  const user = JSON.parse(localStorage.getItem('user'))
  const company = user?.role === 'GeneralManager'
    ? localStorage.getItem('company')
    : user?.company

  if (!company) {
    Swal.fire({ icon: 'error', title: 'Missing Company', text: 'Company not found in localStorage' })
    return
  }

  const job = selectedRequisition.value
  const payload = {
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
    hireDecision: form.value.hireDecision
  }

  try {
    if (isEditMode.value && editId.value) {
      await axios.put(`/candidates/${editId.value}`, payload)
      Swal.fire({ icon: 'success', title: 'Candidate Updated ✅', allowEnterKey: true })
    } else {
      await axios.post('/candidates', payload)
      Swal.fire({ icon: 'success', title: 'Candidate Created ✅', allowEnterKey: true })
    }

    await fetchCandidates()
    updateJobLockedMap()
    toggleForm()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to save candidate' })
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
    allowEnterKey: true
  })

  if (result.isConfirmed) {
    try {
      await axios.delete(`/candidates/${candidate._id}`)
      Swal.fire({ icon: 'success', title: 'Deleted ✅', text: 'Candidate deleted successfully' })
      await fetchCandidates()
      updateJobLockedMap()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Delete failed', text: err.response?.data?.message || 'Unknown error' })
    }
  }
}

// === Fetch Data ===
const fetchCandidates = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    const selectedCompany = localStorage.getItem('company')
    const query = user?.role === 'GeneralManager' && selectedCompany ? `?company=${selectedCompany}` : ''
    const res = await axios.get(`/candidates${query}`)

    candidates.value = res.data.map(c => ({
      ...c,
      jobRequisitionStatus: c.jobRequisitionId?.status || null
    }))
    updateJobLockedMap()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Failed to fetch candidates', text: err.message || 'Unknown error' })
  }
}



const fetchJobRequisitions = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    const selectedCompany = localStorage.getItem('company')
    const company = user?.role === 'GeneralManager' ? selectedCompany : user?.company
    if (!company) throw new Error('Missing company info')

    const res = await axios.get(`/job-requisitions?company=${company}`)
    jobRequisitions.value = res.data
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Failed to fetch requisitions', text: err.message })
  }
}

// === UI & Filters ===
const setActive = (tab) => activeTab.value = 1

const filteredJobTitleOptions = computed(() =>
  jobRequisitions.value.filter(j => {
    if (showForm.value && j.status !== 'Vacant') return false
    if (activeTab.value === 'White Collar') return j.type === 'White Collar'
    if (activeTab.value === 'Blue Collar Sewer') return j.type === 'Blue Collar' && j.subType === 'Sewer'
    if (activeTab.value === 'Blue Collar Non-Sewer') return j.type === 'Blue Collar' && j.subType === 'Non-Sewer'
    return false
  })
)

const filteredCandidates = computed(() =>
  candidates.value.filter(c => {
    if (activeTab.value === 'White Collar') return c.type === 'White Collar'
    if (activeTab.value === 'Blue Collar Sewer') return c.type === 'Blue Collar' && c.subType === 'Sewer'
    if (activeTab.value === 'Blue Collar Non-Sewer') return c.type === 'Blue Collar' && c.subType === 'Non-Sewer'
    return false
  })
)

const formatDate = (val) => (!val ? '-' : dayjs(val).format('DD-MMM-YY').toUpperCase())
const daysBetween = (end, start) => dayjs(end).diff(dayjs(start), 'day')

onMounted(async () => {
  await fetchJobRequisitions()
  await fetchCandidates()
})
</script>


<style scoped>
.table-wrapper {
  max-height: 500px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #eee;
  border-radius: 8px;
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
  background: #fff;
  z-index: 10;
  font-weight: 600;
  padding: 8px 16px;
  white-space: nowrap;
  border-bottom: 1px solid #ccc;
  text-align: left;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.native-table td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 8px 16px;
  font-weight: 400;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
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
  background-color: #4CAF50 !important; /* Green */
}

.red-btn {
  background-color: #d9534f !important; /* Red */
}

.disabled-btn {
  background-color: #9e9e9e !important; /* Gray */
  cursor: not-allowed !important;
  pointer-events: none !important;
  opacity: 0.7;
}

/* Cancel Status */
:deep(.cancel-row .v-btn) {
  background-color: #d9534f !important; /* Solid red */
  color: white !important;
  pointer-events: none !important;
  opacity: 1 !important;
}

.disabled-btn {
  background-color: #9e9e9e !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  opacity: 0.7;
}





</style>
