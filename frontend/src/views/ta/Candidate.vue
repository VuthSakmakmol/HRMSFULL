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
          <!-- Always show these three -->
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedRequisition"
              :items="filteredJobTitleOptions"
              :item-title="item => `${item.jobRequisitionId} - ${item.jobTitle}`"
              item-value="_id"
              label="Job Title"
              variant="outlined"
              return-object
              :disabled="isEditMode"
              required
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field v-model="form.fullName" label="Candidate Name" required variant="outlined" />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="form.applicationSource"
              :items="['LinkedIn', 'Facebook', 'Website', 'Referral', 'Agency']"
              label="Application Source"
              required
              variant="outlined"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-btn color="success" type="submit" class="mt-2" block>
              {{ isEditMode ? 'Update Candidate' : 'Submit' }}
            </v-btn>
          </v-col>

          <!-- Extra fields only in Edit Mode -->
          <template v-if="isEditMode">
            <v-col cols="12" md="3">
              <v-text-field v-model="form.department" label="Department" variant="outlined" disabled />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.recruiter" label="Recruiter" variant="outlined" disabled />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.jobRequisitionCode" label="Job Req Code" variant="outlined" disabled />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.type" label="Type" variant="outlined" disabled />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.subType" label="Sub Type" variant="outlined" disabled />
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
              <th>Application</th>
              <th>Manager Review</th>
              <th>Interview</th>
              <th>Job Offer</th>
              <th>Hired</th>
              <th>Onboard</th>
              <th>Final Decision</th>
              <th>Current Start Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, index) in filteredCandidates" :key="c._id">
              <td>{{ index + 1 }}</td>
              <td>{{ c.candidateId }}</td>
              <td>{{ c.jobRequisitionCode }}</td>
              <td>{{ c.department}}</td>
              <td>{{ c.jobTitle }}</td>
              <td>{{ c.recruiter }}</td>
              <td>{{ c.fullName }}</td>
              <td>{{ c.applicationSource }}</td>
              <td>
                <v-btn
                  :class="getStageClass(c.progressDates?.Application)"
                  @click="openStagePopup('Application', c)"
                >
                  {{ formatDate(c.progressDates?.Application) }}
                </v-btn>
              </td>
              <td>
              <v-btn
                :class="getStageClass(c.progressDates?.ManagerReview)"
                @click="openStagePopup('ManagerReview', c)"
              >    
              {{ formatDate(c.progressDates?.ManagerReview) }}
                </v-btn>
              </td>

              <td>
                <v-btn
                  :class="getStageClass(c.progressDates?.Interview)"
                  @click="openStagePopup('Interview', c)"
                >
                  {{ formatDate(c.progressDates?.Interview) }}
                </v-btn>
              </td>

              <td>
                <v-btn
                  :class="getStageClass(c.progressDates?.JobOffer)"
                  @click="openStagePopup('JobOffer', c)"
                >
                  {{ formatDate(c.progressDates?.JobOffer) }}
                </v-btn>
              </td>

              <td>
                <v-btn
                  :class="getStageClass(c.progressDates?.Hired)"
                  @click="openStagePopup('Hired', c)"
                >
                  {{ formatDate(c.progressDates?.Hired) }}
                </v-btn>
              </td>

              <td>
                <v-btn
                  :class="getStageClass(c.progressDates?.Onboard)"
                  @click="openStagePopup('Onboard', c)"
                >
                  {{ formatDate(c.progressDates?.Onboard) }}
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
              <v-btn color="primary" @click="updateProgressStage">Save</v-btn>
              <v-spacer></v-spacer>
              <v-btn color="grey" @click="dateMenu = false">Cancel</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

      </div>
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

//======= Start progress ==========
const dateMenu = ref(null)
const selectedStage = ref('')
const selectedCandidate = ref(null)
const dateModel = ref('')

const getStageClass = (date) => {
  return date ? 'stage-btn green-btn' : 'stage-btn red-btn'
}


const openStagePopup = (stage, candidate) => {
  selectedStage.value = stage
  selectedCandidate.value = candidate
  dateModel.value = dayjs(candidate.progressDates?.[stage]).format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
  dateMenu.value = true 
}

const updateProgressStage = async () => {
  try {
    const res = await axios.put(`/candidates/${selectedCandidate.value._id}/stage`, {
      stage: selectedStage.value,
      date: dateModel.value
    })
    Swal.fire({ icon: 'success', title: `${selectedStage.value} Updated ✅` })
    fetchCandidates()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Failed to update stage', text: err.response?.data?.message || 'Unknown error' })
  } finally {
    dateMenu.value = false
  }
}

// ========== end progress =================



const form = ref({
  fullName: '',
  applicationSource: ''
})

const toggleForm = () => {
  showForm.value = !showForm.value
  if (!showForm.value) {
    resetForm()
  }
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
    subType: ''
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
}



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

const filteredCandidates = computed(() =>
  candidates.value.filter(c => {
    if (activeTab.value === 'White Collar') return c.type === 'White Collar'
    if (activeTab.value === 'Blue Collar Sewer') return c.type === 'Blue Collar' && c.subType === 'Sewer'
    if (activeTab.value === 'Blue Collar Non-Sewer') return c.type === 'Blue Collar' && c.subType === 'Non-Sewer'
    return false
  })
)

const fetchCandidates = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    const selectedCompany = localStorage.getItem('company')
    const query = user?.role === 'GeneralManager' && selectedCompany
      ? `?company=${selectedCompany}`
      : ''

    const res = await axios.get(`/candidates${query}`)
    candidates.value = res.data
  } catch (err) {
    console.error('❌ Error fetching candidates:', err)
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
    console.error('❌ Error fetching job requisitions:', err)
    Swal.fire({ icon: 'error', title: 'Failed to fetch requisitions', text: err.message })
  }
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
    company
  }

  try {
    if (isEditMode.value && editId.value) {
      await axios.put(`/candidates/${editId.value}`, payload)
      Swal.fire({ icon: 'success', title: 'Candidate Updated ✅', allowEnterKey: true })
    } else {
      await axios.post('/candidates', payload)
      Swal.fire({ icon: 'success', title: 'Candidate Created ✅', allowEnterKey: true })
    }

    fetchCandidates()
    toggleForm()
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err.response?.data?.message || 'Failed to save candidate'
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
    allowEnterKey: true
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(`/candidates/${candidate._id}`);
      Swal.fire({ icon: 'success', title: 'Deleted ✅', text: 'Candidate deleted successfully' });
      fetchCandidates();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Delete failed', text: err.response?.data?.message || 'Unknown error' });
    }
  }
};



const formatDate = (val) => {
  if (!val) return '-'
  return dayjs(val).format('DD-MMM-YY').toUpperCase()
}

const daysBetween = (end, start) => {
  return dayjs(end).diff(dayjs(start), 'day')
}

onMounted(() => {
  fetchCandidates()
  fetchJobRequisitions()
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

/* Start Progress */
.stage-btn {
  font-size: 11px;
  padding: 0 8px;
  min-width: 85px;
  height: 30px;
  color: white !important;
  text-transform: none;
  font-weight: 500;
}

.green-btn {
  background-color: #4CAF50 !important; /* Green */
}

.red-btn {
  background-color: #d9534f !important; /* Red */
}
/* End Progress */
</style>
