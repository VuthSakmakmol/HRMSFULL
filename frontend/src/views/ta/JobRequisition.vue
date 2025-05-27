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
          <v-btn @click="setActive('Blue Collar Non-Sewer')" :color="activeTab === 'Blue Collar Non-Sewer' ? 'primary' : ''">
            Blue Collar (Non-Sewer)
            <v-badge v-if="alerts['Blue Collar Non-Sewer']" dot color="red" class="ml-2" />
          </v-btn>
        </v-col>
      </v-row>

      <!-- Form -->
      <v-form @submit.prevent="submitRequisition">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="form.jobTitle"
              :items="jobTitles"
              label="Job Title"
              item-title="jobTitle"
              item-value="jobTitle"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="onJobTitleSelected"
              required
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="form.recruiter"
              :items="recruiterList"
              label="Recruiter"
              variant="outlined"
              required
              clearable
              hide-details
              density="compact"
            />
          </v-col>

          <v-col cols="6" md="2">
            <v-text-field v-model.number="form.targetCandidates" type="number" label="Target" variant="outlined" />
          </v-col>

          <v-col cols="6" md="2">
            <v-menu v-model="dateMenu" :close-on-content-click="false">
              <template #activator="{ props }">
                <v-text-field v-bind="props" v-model="form.openingDate" label="Opening Date" readonly prepend-inner-icon="mdi-calendar" variant="outlined" />
              </template>
              <v-date-picker @update:modelValue="date => form.openingDate = dayjs(date).format('YYYY-MM-DD')" />
            </v-menu>
          </v-col>

          <v-col cols="12" md="2">
            <v-btn type="submit" color="success" class="mt-2" block>CREATE</v-btn>
          </v-col>
        </v-row>
      </v-form>

      <v-divider class="my-4" />

      <!-- Table -->
      <v-table class="elevation-1 rounded-lg" density="compact" fixed-header height="550px">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Department</th>
            <th>Job Title</th>
            <th>Opening Date</th>
            <th>Recruiter</th>
            <th>Status</th>
            <th>New Hire Start Date</th>
            <th>Hiring Cost</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in filteredRequisitions" :key="job._id">
            <td>{{ job.jobRequisitionId }}</td>
            <td>{{ job.departmentName }}</td>
            <td>{{ job.jobTitle }}</td>
            <td>{{ formatDate(job.openingDate) }}</td>
            <td>{{ job.recruiter }}</td>
            <td>
              <v-chip :color="getStatusColor(job.status)" size="small" variant="outlined">{{ job.status }}</v-chip>
            </td>
            <td>{{ formatDate(job.startDate) }}</td>
            <td>{{ formatCost(job.hiringCost) }}</td>
            <td>
              <v-btn icon size="small" color="primary" @click="editJob(job)">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="small" color="error" @click="deleteJob(job)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import dayjs from 'dayjs'
import api from '@/utils/axios'
import Swal from 'sweetalert2'

const role = localStorage.getItem('role') || ''
const company = localStorage.getItem('company') || ''

const form = ref({
  jobTitle: '',
  recruiter: '',
  targetCandidates: 1,
  openingDate: ''
})

const dateMenu = ref(false)
const recruiterList = ['Siraphop Chirathasuwan', 'Leng Puthy', 'Lip Kimleang', 'Lit Sony']

const jobTitles = ref([])
const requisitions = ref([])
const alerts = ref({
  'White Collar': false,
  'Blue Collar Sewer': false,
  'Blue Collar Non-Sewer': false
})
const activeTab = ref('White Collar')

const fetchJobTitles = async () => {
  try {
    const res = await api.get('/job-requisitions/job-titles')
    jobTitles.value = res.data.jobTitles
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Failed to Load Job Titles', text: err?.response?.data?.message || 'Error loading job titles' })
  }
}

const fetchRequisitions = async () => {
  try {
    const query = role === 'GeneralManager' ? `?company=${company}` : ''
    const res = await api.get(`/job-requisitions${query}`)
    requisitions.value = res.data
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Failed to Load Requisitions', text: err?.response?.data?.message || 'Error loading requisitions' })
  }
}

const submitRequisition = async () => {
  try {
    const payload = { ...form.value }
    await api.post('/job-requisitions', payload)

    alerts.value[getAlertKey(payload)] = true
    localStorage.setItem(`seen_${getAlertKey(payload)}`, 'false')

    await Swal.fire({ icon: 'success', title: 'Created', text: 'Job requisition created' })

    form.value = { jobTitle: '', recruiter: '', targetCandidates: 1, openingDate: '' }
    fetchRequisitions()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || 'Failed to create requisition' })
  }
}

const filteredRequisitions = computed(() => {
  if (activeTab.value === 'White Collar') {
    return requisitions.value.filter(j => j.type === 'White Collar')
  } else if (activeTab.value === 'Blue Collar Sewer') {
    return requisitions.value.filter(j => j.type === 'Blue Collar' && j.subType === 'Sewer')
  } else if (activeTab.value === 'Blue Collar Non-Sewer') {
    return requisitions.value.filter(j => j.type === 'Blue Collar' && j.subType === 'Non-Sewer')
  }
  return []
})

const setActive = (tab) => {
  activeTab.value = tab
  alerts.value[tab] = false
  localStorage.setItem(`seen_${tab}`, 'true')
}

const onJobTitleSelected = () => {
  const found = jobTitles.value.find(j => j.jobTitle === form.value.jobTitle)
  if (found) {
    form.value.departmentId = found.departmentId
    form.value.departmentName = found.departmentName
    form.value.type = found.type
    form.value.subType = found.subType
  }
}

const formatDate = (val) => val ? dayjs(val).format('DD-MMM-YY') : '-'
const formatCost = (val) => `${Number(val || 0).toFixed(2)}$`
const getStatusColor = (status) => ({
  Vacant: 'blue-lighten-1',
  Filled: 'green-lighten-3',
  Suspended: 'orange-lighten-3',
  Cancel: 'red-lighten-4'
}[status] || 'grey-lighten-3')

const getAlertKey = (entry) => {
  if (entry.type === 'White Collar') return 'White Collar'
  if (entry.type === 'Blue Collar' && entry.subType === 'Sewer') return 'Blue Collar Sewer'
  return 'Blue Collar Non-Sewer'
}

// placeholder for edit/delete
const editJob = (job) => {}
const deleteJob = (job) => {}

onMounted(() => {
  fetchJobTitles()
  fetchRequisitions()
  for (const key in alerts.value) {
    alerts.value[key] = localStorage.getItem(`seen_${key}`) !== 'true'
  }
})
</script>
