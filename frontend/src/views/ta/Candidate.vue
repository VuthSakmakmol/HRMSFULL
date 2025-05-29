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
      <v-table>
        <thead>
          <tr>
            <th>No</th>
            <th>Candidate ID</th>
            <th>Full Name</th>
            <th>Job Title</th>
            <th>Department</th>
            <th>Recruiter</th>
            <th>Application Source</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, index) in filteredCandidates" :key="c._id">
            <td>{{ index + 1 }}</td>
            <td>{{ c.candidateId }}</td>
            <td>{{ c.fullName }}</td>
            <td>{{ c.jobTitle }}</td>
            <td>{{ c.departmentName }}</td>
            <td>{{ c.recruiter }}</td>
            <td>{{ c.applicationSource }}</td>
            <td>{{ c.progress }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'

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

// ✅ Filter job titles (only Vacant when form open)
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
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')
    if (!token || !userRaw) throw new Error('User not logged in')

    const user = JSON.parse(userRaw)
    const selectedCompany = localStorage.getItem('company')
    const company = user.role === 'GeneralManager' ? selectedCompany : user.company

    if (!company) throw new Error('Missing company info')

    const res = await axios.get(`/job-requisitions?company=${company}`)
    jobRequisitions.value = res.data
  } catch (err) {
    console.error('❌ Error fetching job requisitions:', err)
    Swal.fire({
      icon: 'error',
      title: 'Failed to fetch requisitions',
      text: err.message
    })
  }
}



const submitCandidate = async () => {
  if (!selectedRequisition.value) {
    Swal.fire({ icon: 'error', title: 'Please select a job title' })
    return
  }

  const payload = {
    jobRequisitionId: selectedRequisition.value._id,
    jobRequisitionCode: selectedRequisition.value.jobRequisitionId,
    departmentCode: selectedRequisition.value.departmentCode || 'UNKNOWN',
    jobTitle: selectedRequisition.value.jobTitle,
    recruiter: selectedRequisition.value.recruiter,
    departmentId: selectedRequisition.value.departmentId,
    departmentName: selectedRequisition.value.departmentName,
    type: selectedRequisition.value.type,
    subType: selectedRequisition.value.subType,
    fullName: form.value.fullName,
    applicationSource: form.value.applicationSource
  }

  try {
    await axios.post('/candidates', payload)
    Swal.fire({ icon: 'success', title: 'Candidate Created', allowEnterKey: true })
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

onMounted(() => {
  fetchCandidates()
  fetchJobRequisitions()
})
</script>

