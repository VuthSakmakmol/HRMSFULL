<!-- views/ta/Candidate.vue -->
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
            variant="outlined" autocomplete="off"
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
            variant="outlined" autocomplete="off"
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
            variant="outlined" autocomplete="off"
            class="text-white font-weight-bold hover-filled hover-excel "
            elevation="0"
            @click="exportToExcel"
          >
            <v-icon start>mdi-file-excel</v-icon>
            Export Excel
          </v-btn>
        </v-col>
        <v-col cols="auto">
          
          <!-- ======================================================================================= -->
          <!-- <v-btn
            color="orange"
            variant="outlined" autocomplete="off"
            class="text-white font-weight-bold hover-filled hover-excel"
            elevation="0"
            @click="$refs.excelInput.click()"
          >
            <v-icon start>mdi-upload</v-icon>
            Import Excel
          </v-btn> -->
          <!-- ================================================================================================ -->

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
      <v-form v-if="showForm" ref="formSection" @submit.prevent="submitCandidate">
        <v-row dense>
          <v-col cols="12" md="3">
            <v-autocomplete
              v-model="selectedRequisition"
              :items="filteredJobTitleOptions"
              :item-title="item => `${item.jobRequisitionId} - ${item.jobTitle}`"
              item-value="_id"
              label="Job Title"
              variant="outlined" autocomplete="off"
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
              variant="outlined" autocomplete="off"
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
              variant="outlined" autocomplete="off"
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
                variant="outlined" autocomplete="off"
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
              variant="outlined" autocomplete="off"
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
          <v-text-field v-model="filters.candidateId" label="Candidate Id" variant="outlined" autocomplete="off" clearable density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.jobId" label="Job Id" variant="outlined" autocomplete="off" clearable dense density="compact" hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.department" label="Department" variant="outlined" autocomplete="off" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model="filters.jobTitle" label="Job Title" variant="outlined" autocomplete="off" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.recruiter" label="Recruiter" variant="outlined" autocomplete="off" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.fullName" label="Candidate Name" variant="outlined" autocomplete="off" clearable dense density="compact" hide-details/>
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filters.applicationSource"
            :items="['Agency', 'Banner / Job Announcement Board', 'Brochure', 'FIF', 'Facebook', 'HR Call', 'Job Portal', 'LinkedIn','Telegram', 'Other', ]"
            label="Application Source"
            variant="outlined" autocomplete="off"
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
            variant="outlined" autocomplete="off"
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
              <th v-for="stage in ['Application','Sent to Manager','Interview','JobOffer','Hired','Onboard']" :key="stage">{{ stage }}</th>
              <th>Final Decision</th>
              <th>Start Duration</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, index) in candidates" :key="c._id">
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
            :length="Math.ceil(totalCandidates / candidatePerPage)"
            total-visible="7"
            @update:model-value="fetchCandidates"
          />
        </v-col>

        <v-col cols="12" md="3" class="d-flex justify-end">
          <v-select
            v-model="candidatePerPage"
            :items="[25, 50, 100]"
            label="Rows per page"
            variant="outlined" autocomplete="off"
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
import { ref, nextTick, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import socket from '@/utils/socket' // ✅ Use shared socket instance
import readXlsxFile from 'read-excel-file'

const activeTab = ref('White Collar')
const showForm = ref(false)
const candidates = ref([])
const jobRequisitions = ref([])
const selectedRequisition = ref(null)
const isEditMode = ref(false)
const editId = ref(null)
const route = useRoute()
const socketListenerAdded = ref(false)
const totalCandidates = ref(0)
const formSection = ref(null)
const jobTitleOptions = ref([])


// ================= Web Socket ========================



// ================= End Web socket

// ================= Paginationc========================
const candidatePage = ref(1)
const candidatePerPage = ref(25)

// const paginatedCandidates = computed(() => {
//   const start = (candidatePage.value - 1) * candidatePerPage.value
//   const end = start + candidatePerPage.value
//   return filteredCandidates.value.slice(start, end)
// })

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
  const status = candidate.jobRequisitionId?.status;
  if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) return true;
  if (status === 'Cancel') return true;

  const jobId = candidate.jobRequisitionId?._id || candidate.jobRequisitionId;
  const allowedIds = jobLockedMap.value[jobId];
  if (!allowedIds) return false;

  return !allowedIds.includes(candidate._id);
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

  form.value = {
    fullName: candidate.fullName,
    applicationSource: candidate.applicationSource,
    department: candidate.department,
    recruiter: candidate.recruiter,
    jobRequisitionCode: candidate.jobRequisitionCode,
    type: candidate.type,
    subType: candidate.subType,
    hireDecision: candidate.hireDecision || 'Candidate in Process'
  }
  nextTick(() => {
    const formEl = formSection.value?.$el || formSection.value
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
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
    const company = user?.role === 'GeneralManager' ? selectedCompany : user?.company
    if (!company) throw new Error('Company not found')

    const params = {
      page: candidatePage.value,
      limit: candidatePerPage.value,
      company,
      ...filters.value,
      type: activeTab.value === 'White Collar' ? 'White Collar' : 'Blue Collar',
      subType:
        activeTab.value === 'Blue Collar Sewer'
          ? 'Sewer'
          : activeTab.value === 'Blue Collar Non-Sewer'
          ? 'Non-Sewer'
          : undefined
    }

    const res = await axios.get('/candidates', { params })
    candidates.value = res.data.candidates
    totalCandidates.value = res.data.total
    updateJobLockedMap()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: err.message })
  }
}

const getStageClass = (date) => { return date ? 'stage-btn green-btn' : 'stage-btn red-btn'}
const formatDate = (val) => (!val ? '-' : dayjs(val).format('DD-MMM-YY').toUpperCase())
const daysBetween = (end, start) => dayjs(end).diff(dayjs(start), 'day')

const fetchJobRequisitions = async (includeAll = false) => {
  try {
    const type = activeTab.value === 'White Collar' ? 'White Collar' : 'Blue Collar';
    const subType = activeTab.value === 'Blue Collar Sewer'
      ? 'Sewer'
      : activeTab.value === 'Blue Collar Non-Sewer'
        ? 'Non-Sewer'
        : undefined;

    const params = new URLSearchParams();
    params.append('type', type);
    if (subType) params.append('subType', subType);
    if (includeAll) params.append('all', 'true'); // Optional for future logic

    // ✅ Use the vacant-only endpoint
    const res = await axios.get(`/job-requisitions/vacant?${params.toString()}`);
    jobRequisitions.value = res.data || [];

    // ✅ Extract unique job titles for form use
    const titles = [...new Set(jobRequisitions.value.map(j => j.jobTitle))].filter(Boolean);
    jobTitleOptions.value = titles;

  } catch (error) {
    console.error('Error fetching requisitions:', error);
    Swal.fire({
      icon: 'error',
      title: 'Failed to load job requisitions',
      text: error.response?.data?.message || error.message
    });
  }
};




// === UI & Filters ===
const setActive = (tab) => {
  activeTab.value = tab
}


const filteredJobTitleOptions = computed(() => {
  const isWhite = (j) => activeTab.value === 'White Collar' && j.type === 'White Collar'
  const isSewer = (j) => activeTab.value === 'Blue Collar Sewer' && j.type === 'Blue Collar' && j.subType === 'Sewer'
  const isNonSewer = (j) => activeTab.value === 'Blue Collar Non-Sewer' && j.type === 'Blue Collar' && j.subType === 'Non-Sewer'

  return jobRequisitions.value.filter(j => {
    if (showForm.value && j.status !== 'Vacant') return false
    return isWhite(j) || isSewer(j) || isNonSewer(j)
  })
})



const exportToExcel = () => { 
  const data = candidates.value.map((c, index) => ({
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
  try {
    const file = event.target.files[0]
    if (!file) return

    await fetchJobRequisitions(true) // ✅ Refresh job requisitions before import

    const data = await readXlsxFile(file)
    const headers = data[0]
    const rows = data.slice(1)

    // ✅ Match headers from your actual Excel file
    const requiredHeaders = ['FullName', 'JobTitle', 'Recruiter', 'Source']
    const isValid = requiredHeaders.every(h => headers.includes(h))

    if (!isValid) {
      Swal.fire('❌ Invalid Format', 'Excel must contain headers: FullName, JobTitle, Recruiter, Source', 'error')
      return
    }

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      const rowData = Object.fromEntries(headers.map((h, i) => [h, row[i]]))

      const jobTitle = rowData['JobTitle']
      const matchedRequisitions = jobRequisitions.value
        .filter(jr => jr.jobTitle === jobTitle && jr.status === 'Vacant')
        .sort((a, b) => a.offerCount - b.offerCount)

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
        fullName: rowData['FullName'] || '',
        recruiter: rowData['Recruiter'] || '',
        applicationSource: rowData['Source'] || '',
        jobRequisitionId: bestMatch._id,
        jobRequisitionCode: bestMatch.jobRequisitionId,
        company: bestMatch.company,
        department: bestMatch.departmentName,
        jobTitle: bestMatch.jobTitle,
        type: bestMatch.type,
        subType: bestMatch.subType || 'General',
        progressDates: {
          Application: new Date().toISOString()
        },
        hireDecision: 'Candidate in Process'
      }

      try {
        await axios.post('/candidates', payload)
        imported++
      } catch (err) {
        console.error('❌ Import error for candidate:', rowData['FullName'], err)
        skipped++
      }
    }

    Swal.fire({
      icon: 'success',
      title: '✅ Import Complete',
      html: `Imported: <b>${imported}</b><br>Skipped: <b>${skipped}</b>`,
      allowEnterKey: true
    })

    await fetchCandidates()
    await fetchJobRequisitions(true) // ✅ Refresh job requisitions after import

  } catch (err) {
    console.error('❌ Excel Import Error:', err)
    Swal.fire('Import Failed', err.message, 'error')
  } finally {
    event.target.value = null // reset file input
  }
}





onBeforeUnmount(() => {
  if (socketListenerAdded.value) {
    socket.off('candidateAdded')
    socket.off('candidateUpdated')
    socket.off('candidateDeleted')
    socketListenerAdded.value = false
  }
})

onMounted(async () => {
  await fetchJobRequisitions(true)
  await fetchCandidates()

  const tabToRoom = {
    'White Collar': 'white-collar',
    'Blue Collar Sewer': 'blue-collar-sewer',
    'Blue Collar Non-Sewer': 'blue-collar-nonsewer'
  }
  socket.emit('join-room', tabToRoom[activeTab.value])
  console.log('✅ Joined socket room:', tabToRoom[activeTab.value])
  
  setupSocketListeners()
})


const setupSocketListeners = () => {
  if (socketListenerAdded.value) return // avoid duplicate listeners

  socket.on('candidateAdded', (candidate) => {
    console.log('📥 Candidate added via WebSocket:', candidate)
    if (candidatePage.value === 1) {
      candidates.value.unshift(candidate)
      if (candidates.value.length > candidatePerPage.value) candidates.value.pop()
    } else {
      Swal.fire({
        icon: 'info',
        title: 'New Candidate Added',
        text: 'Click to refresh and see the update.',
        confirmButtonText: 'Refresh Now',
        allowEnterKey: true
      }).then((result) => result.isConfirmed && fetchCandidates())
    }
  })

  socket.on('candidateUpdated', (updated) => {
    console.log('📥 Candidate updated via WebSocket:', updated)
    const idx = candidates.value.findIndex(c => c._id === updated._id)
    if (idx !== -1) candidates.value[idx] = updated
  })

  socket.on('candidateDeleted', (deletedId) => {
    console.log('📥 Candidate deleted via WebSocket:', deletedId)
    candidates.value = candidates.value.filter(c => c._id !== deletedId)
  })

  socket.on('jobUpdated', (updatedJob) => {
    console.log('📥 Job updated via WebSocket:', updatedJob)
    const idx = jobRequisitions.value.findIndex(j => j._id === updatedJob._id)
    if (idx !== -1) jobRequisitions.value[idx] = updatedJob
  })

  socket.on('jobAvailabilityChanged', (availability) => {
    console.log('📥 Job availability changed via WebSocket:', availability)
    const idx = jobRequisitions.value.findIndex(j => j._id === availability.jobId)
    if (idx !== -1) {
      jobRequisitions.value[idx].offerFull = availability.offerFull
      jobRequisitions.value[idx].onboardFull = availability.onboardFull
      jobRequisitions.value[idx].offerCount = availability.offerCount
      jobRequisitions.value[idx].onboardCount = availability.onboardCount
    }
  })

  socketListenerAdded.value = true
}


onBeforeUnmount(() => {
  if (socketListenerAdded.value) {
    socket.off('candidateAdded')
    socket.off('candidateUpdated')
    socket.off('candidateDeleted')
    socket.off('jobUpdated')
    socket.off('jobAvailabilityChanged')
    socketListenerAdded.value = false
  }
})

watch(candidatePerPage, () => {
  candidatePage.value = 1
  fetchCandidates()
})

watch([filters, activeTab], () => {
  candidatePage.value = 1
  fetchCandidates()
}, { deep: true })

watch([activeTab], async () => {
  await fetchJobRequisitions(true)
  await fetchCandidates()

  const tabToRoom = {
    'White Collar': 'white-collar',
    'Blue Collar Sewer': 'blue-collar-sewer',
    'Blue Collar Non-Sewer': 'blue-collar-nonsewer'
  }
  socket.emit('join-room', tabToRoom[activeTab.value])
  console.log('🔄 Re-joined socket room:', tabToRoom[activeTab.value])
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




