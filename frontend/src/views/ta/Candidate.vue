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
            <v-select
              v-model="selectedRequisition"
              :items="filteredJobTitleOptions"
              :item-title="item => `${item.jobRequisitionId} - ${item.jobTitle}`"
              item-value="_id"
              label="Job Title"
              variant="outlined"
              return-object
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
            <v-btn color="success" type="submit" class="mt-2" block>Submit</v-btn>
          </v-col>
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
              <td><v-btn class="stage-btn">{{ formatDate(c.progressDates?.Application) }}</v-btn></td>
              <td><v-btn class="stage-btn">{{ formatDate(c.progressDates?.ManagerReview) }}</v-btn></td>
              <td><v-btn class="stage-btn">{{ formatDate(c.progressDates?.Interview) }}</v-btn></td>
              <td><v-btn class="stage-btn">{{ formatDate(c.progressDates?.JobOffer) }}</v-btn></td>
              <td><v-btn class="stage-btn">{{ formatDate(c.progressDates?.Hired) }}</v-btn></td>
              <td><v-btn class="stage-btn">{{ formatDate(c.progressDates?.Onboard) }}</v-btn></td>
              <td>{{ c.hireDecision || '-' }}</td>
              <td>
                <span v-if="c.progressDates?.Application && c.progressDates?.Onboard">
                  {{ daysBetween(c.progressDates.Onboard, c.progressDates.Application) }} days
                </span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
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

const form = ref({
  fullName: '',
  applicationSource: ''
})

const toggleForm = () => {
  showForm.value = !showForm.value
  if (!showForm.value) {
    selectedRequisition.value = null
    form.value = { fullName: '', applicationSource: '' }
  }
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
    await axios.post('/candidates', payload)
    Swal.fire({ icon: 'success', title: 'Candidate Created ✅', allowEnterKey: true })
    fetchCandidates()
    toggleForm()
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err.response?.data?.message || 'Failed to create candidate'
    })
  }
}



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

.stage-btn {
  font-size: 11px;
  padding: 0 8px;
  min-width: 85px;
  height: 30px;
  background-color: #999966 !important;
  color: white !important;
}
</style>
