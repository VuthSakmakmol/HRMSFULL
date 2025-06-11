<template>
  <v-container fluid>
    <v-card class="pa-4">
      <!-- Tabs -->
      <v-row class="mb-4">
        <v-col cols="auto" v-for="tab in ['White Collar', 'Blue Collar Sewer', 'Blue Collar Non-Sewer']" :key="tab">
          <v-btn @click="setActive(tab)" :color="activeTab === tab ? 'primary' : ''">{{ tab }}</v-btn>
        </v-col>
      </v-row>

      <!-- Toggle Buttons -->
      <v-row class="mb-4" dense>
        <v-col cols="auto">
          <v-btn
            color="primary"
            variant="outlined"
            class="text-white font-weight-bold hover-filled hover-primary"
            elevation="0"
            @click="toggleForm"
          >
            <!-- <v-icon start>mdi-plus</v-icon> -->
            {{ showForm ? 'Close Form' : 'Add Candidate' }}
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn
            color="teal"
            variant="outlined"
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
            class="text-white font-weight-bold hover-filled hover-excel "
            elevation="0"
            @click="exportToExcel"
          >
            <v-icon start>mdi-file-excel</v-icon>
            Export Excel
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="orange"
            variant="outlined"
            class="text-white font-weight-bold hover-filled hover-excel"
            elevation="0"
            @click="$refs.excelInput.click()"
          >
            <v-icon start>mdi-upload</v-icon>
            Import Excel
          </v-btn>
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
              
            />
          </v-col>
          <v-col cols="8" md="2">
            <v-text-field
              v-model="form.fullName"
              label="Candidate Name"
              required
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="8" md="2">
            <v-autocomplete
              v-model="form.applicationSource"
              :items="['Agency', 'Banner / Job Announcement Board', 'Brochure', 'FIF', 'Facebook', 'HR Call', 'Job Portal', 'LinkedIn','Telegram', 'Other', ]"
              label="Application Source"
              clearable
              variant="outlined"
              density="compact"
              hide-details
              auto-select-first
            />
          </v-col>
          <v-col cols="8" md="3" v-if="isEditMode">
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
          <v-col cols="8" md="2">
            <v-btn
              color="success"
              type="submit"
              variant="outlined"
              density="compact"
              style="height: 40px"
              block
            >
              {{ isEditMode ? 'Update Candidate' : 'Submit' }}
            </v-btn>
          </v-col>
        </v-row>
      </v-form>
      <!-- Candidate Form -->

      <!-- ✅ Filter Form should be OUTSIDE -->
      <v-row v-if="showFilterForm" class="mb-4" dense>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.candidateId" label="Candidate Id" variant="outlined" clearable density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.jobId" label="Job Id" variant="outlined" clearable dense density="compact" hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.department" label="Department" variant="outlined" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model="filters.jobTitle" label="Job Title" variant="outlined" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.recruiter" label="Recruiter" variant="outlined" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.fullName" label="Candidate Name" variant="outlined" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filters.applicationSource"
            :items="['Agency', 'Banner / Job Announcement Board', 'Brochure', 'FIF', 'Facebook', 'HR Call', 'Job Portal', 'LinkedIn','Telegram', 'Other', ]"
            label="Application Source"
            variant="outlined"
            clearable
            dense
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filters.hireDecision"
            :items="['Candidate in Process', 'Candidate Refusal', 'Not Hired']"
            label="Final Decision"
            variant="outlined"
            clearable
            density="compact"
            dense
            hide-details
          />
        </v-col>
      </v-row>


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
              <td style="gap: 3px; display: flex;">
                <v-btn icon size="small" color="primary" @click="startEdit(c)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                  <v-btn icon size="small" color="error" @click="confirmDelete(c)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
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
import { useRoute } from 'vue-router'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'


const activeTab = ref('White Collar')
const showForm = ref(false)
const candidates = ref([])
const jobRequisitions = ref([])
const selectedRequisition = ref(null)
const isEditMode = ref(false)
const editId = ref(null)
const route = useRoute()


// ================= Paginationc========================
const candidatePage = ref(1)
const candidatePerPage = ref(25)

const paginatedCandidates = computed(() => {
  const start = (candidatePage.value - 1) * candidatePerPage.value
  const end = start + candidatePerPage.value
  return filteredCandidates.value.slice(start, end)
})

// =================== End Pagination ======================


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

const showFilterForm = ref(false)
const filters = ref({
  candidateId: '',
  jobId: '',
  jobTitle: '',
  department: '',
  recruiter: '',
  fullName: '',
  applicationSource: '',
  hireDecision: ''
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
  const rawDate = candidate.progressDates?.[stage]
  const parsed = dayjs(rawDate)
  dateModel.value = parsed.isValid() ? parsed.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
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
const setActive = (tab) => {
  activeTab.value = tab
}


const filteredJobTitleOptions = computed(() =>
  jobRequisitions.value.filter(j => {
    if (showForm.value && j.status !== 'Vacant') return false
    if (activeTab.value === 'White Collar') return j.type === 'White Collar'
    if (activeTab.value === 'Blue Collar Sewer') return j.type === 'Blue Collar' && j.subType === 'Sewer'
    if (activeTab.value === 'Blue Collar Non-Sewer') return j.type === 'Blue Collar' && j.subType === 'Non-Sewer'
    return false
  })
)
const filteredCandidates = computed(() => {
  let base = candidates.value
  candidatePage.value = 1

  // Route filter
  const jobRequisitionId = route.query.jobRequisitionId
  if (jobRequisitionId) {
    base = base.filter(c => {
      if (typeof c.jobRequisitionId === 'string') return c.jobRequisitionId === jobRequisitionId
      return c.jobRequisitionId?._id === jobRequisitionId
    })
  }


  // Tab filter
  if (activeTab.value === 'White Collar') {
    base = base.filter(c => c.type === 'White Collar')
  } else if (activeTab.value === 'Blue Collar Sewer') {
    base = base.filter(c => c.type === 'Blue Collar' && c.subType === 'Sewer')
  } else if (activeTab.value === 'Blue Collar Non-Sewer') {
    base = base.filter(c => c.type === 'Blue Collar' && c.subType === 'Non-Sewer')
  }

  // Text filters
  
  if (filters.value.candidateId) {
    base = base.filter(c => c.candidateId?.toLowerCase().includes(filters.value.candidateId.toLowerCase()))
  }
  if (filters.value.jobId) {
    base = base.filter(c => c.jobRequisitionCode?.toLowerCase().includes(filters.value.jobId.toLowerCase()))
  }
  if (filters.value.department) {
    base = base.filter(c => c.department?.toLowerCase().includes(filters.value.department.toLowerCase()))
  }
  if (filters.value.jobTitle) {
    base = base.filter(c => c.jobTitle?.toLowerCase().includes(filters.value.jobTitle.toLowerCase()))
  }
  if (filters.value.fullName) {
    base = base.filter(c => c.fullName?.toLowerCase().includes(filters.value.fullName.toLowerCase()))
  }
  if (filters.value.recruiter) {
    base = base.filter(c => c.recruiter?.toLowerCase().includes(filters.value.recruiter.toLowerCase()))
  }
  if (filters.value.applicationSource) {
    base = base.filter(c => c.applicationSource?.toLowerCase().includes(filters.value.applicationSource.toLowerCase()))
  }
  if (filters.value.hireDecision) {
    base = base.filter(c => c.hireDecision === filters.value.hireDecision)
  }

  return base
})

const exportToExcel = () => {
  const data = filteredCandidates.value.map((c, index) => ({
    No: index + 1,
    CandidateID: c.candidateId,
    JobID: c.jobRequisitionCode,
    Department: c.department,
    JobTitle: c.jobTitle,
    Recruiter: c.recruiter,
    FullName: c.fullName,
    Source: c.applicationSource,
    Application: formatDate(c.progressDates?.Application),
    ManagerReview: formatDate(c.progressDates?.ManagerReview),
    Interview: formatDate(c.progressDates?.Interview),
    JobOffer: formatDate(c.progressDates?.JobOffer),
    Hired: formatDate(c.progressDates?.Hired),
    Onboard: formatDate(c.progressDates?.Onboard),
    FinalDecision: c.hireDecision || '',
    StartDuration: (c.progressDates?.Application && c.progressDates?.Onboard)
      ? `${daysBetween(c.progressDates.Onboard, c.progressDates.Application)} days`
      : ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
  saveAs(blob, 'Candidates.xlsx')
}
const handleImportExcel = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)

    const user = JSON.parse(localStorage.getItem('user'))
    const selectedCompany = localStorage.getItem('company')
    const company = user?.role === 'GeneralManager' ? selectedCompany : user?.company

    if (!company) {
      Swal.fire({ icon: 'error', title: 'Missing company in localStorage' })
      return
    }

    const imported = []

    for (const [index, row] of rows.entries()) {
      const matchedJob = jobRequisitions.value.find(j => j.jobRequisitionId === row.JobID)
      if (!matchedJob) {
        console.warn(`Row ${index + 1}: No matching job found for JobID: ${row.JobID}`)
        continue
      }

      const payload = {
        fullName: row.FullName || '',
        recruiter: row.Recruiter || '',
        applicationSource: row.Source || '',
        jobRequisitionId: matchedJob._id,
        jobRequisitionCode: matchedJob.jobRequisitionId,
        department: matchedJob.departmentName,
        jobTitle: matchedJob.jobTitle,
        company,
        type: matchedJob.type,
        subType: matchedJob.subType || null,
        progressDates: {
          Application: row.Application || new Date(),
          ManagerReview: row.ManagerReview || null,
          Interview: row.Interview || null,
          JobOffer: row.JobOffer || null,
          Hired: row.Hired || null,
          Onboard: row.Onboard || null
        }
      }

      try {
        const res = await axios.post('/candidates', payload)
        imported.push(res.data)
      } catch (err) {
        console.error(`❌ Import row ${index + 1} failed:`, err.response?.data || err.message)
      }
    }

    await fetchCandidates()

    Swal.fire({
      icon: 'success',
      title: `✅ Imported ${imported.length} candidates to database`,
      timer: 2000,
      showConfirmButton: false
    })
  } catch (err) {
    console.error(err)
    Swal.fire({ icon: 'error', title: 'Import failed', text: err.message })
  }

  event.target.value = ''
}





const formatDate = (val) => (!val ? '-' : dayjs(val).format('DD-MMM-YY').toUpperCase())
const daysBetween = (end, start) => dayjs(end).diff(dayjs(start), 'day')

// onMounted(async () => {
//   await fetchJobRequisitions()
//   await fetchCandidates()
// })

onMounted(async () => {
  await fetchJobRequisitions()
  await fetchCandidates()

  const jobRequisitionId = route.query.jobRequisitionId
  if (jobRequisitionId) {
    const job = jobRequisitions.value.find(j => j._id === jobRequisitionId)
    if (job) {
      // Set the active tab
      if (job.type === 'White Collar') activeTab.value = 'White Collar'
      else if (job.subType === 'Sewer') activeTab.value = 'Blue Collar Sewer'
      else activeTab.value = 'Blue Collar Non-Sewer'

      // ✅ Auto-fill the form with this job
      selectedRequisition.value = job
      showForm.value = true

      form.value.department = job.departmentName
      form.value.recruiter = job.recruiter
      form.value.jobRequisitionCode = job.jobRequisitionId
      form.value.type = job.type
      form.value.subType = job.subType
    }
  }
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


/* Filter */
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
  background-color: #43a047 !important; /* Green */
  color: white !important;
}



</style>
