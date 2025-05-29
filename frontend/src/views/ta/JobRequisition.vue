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

      <!-- Toggle Buttons -->
      <v-row class="mb-4" dense>
        <v-col cols="auto">
          <v-btn color="primary" class="text-white font-weight-bold" @click="showCreateForm = !showCreateForm">
            <v-icon start>mdi-plus</v-icon>
            {{ showCreateForm ? 'Close Create Form' : 'New Job Requisition' }}
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn color="teal darken-1" class="text-white font-weight-bold" @click="showFilterForm = !showFilterForm">
            <v-icon start>mdi-magnify</v-icon>
            {{ showFilterForm ? 'Close Filter Form' : 'Filter Requisitions' }}
          </v-btn>
        </v-col>

        <v-col cols="auto">
          <v-btn color="info" class="text-white font-weight-bold" @click="exportToExcel">
            <v-icon start>mdi-file-excel</v-icon>
            Export to Excel
          </v-btn>
        </v-col>
      </v-row>


      <!-- CREATE FORM -->
        <v-form v-if="showCreateForm" @submit.prevent="isEditing ? updateRequisition() : submitRequisition()">
          <v-row dense>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.jobTitle"
                :items="jobTitles.map(j => j.jobTitle)"
                label="Job Title"
                clearable
                variant="outlined"
                @update:modelValue="onJobTitleSelected"
              />
            </v-col>

            <v-col cols="12" md="3">
              <v-select
                v-model="form.recruiter"
                :items="recruiterList"  
                label="Recruiter"
                clearable
                variant="outlined"
              />
            </v-col>

            <v-col cols="6" md="2">
              <v-text-field
                v-model.number="form.targetCandidates"
                label="Target Candidates"
                type="number"
                min="1"
                variant="outlined"
              />
            </v-col>

            <v-col cols="6" md="2">
              <v-menu v-model="dateMenu" :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    v-model="form.openingDate"
                    label="Opening Date"
                    readonly
                    prepend-inner-icon="mdi-calendar"
                    variant="outlined"
                  />
                </template>
                <v-date-picker @update:modelValue="date => form.openingDate = dayjs(date).format('YYYY-MM-DD')" />
              </v-menu>
            </v-col>

            

            

            <!-- Status field only when editing -->
            <v-col cols="12" md="2" v-if="isEditing">
              <v-select
                v-model="form.status"
                :items="['Vacant', 'Filled', 'Suspended', 'Cancel']"
                label="Status"
                variant="outlined"
                clearable
              />
            </v-col>
            

            <!-- Only when editing -->
            <template v-if="isEditing">
              <v-col cols="6" md="2">
                <v-text-field
                  v-model.number="form.hiringCost"
                  type="number"
                  label="Hiring Cost"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </v-col>

              <v-col cols="6" md="2">
                <v-menu v-model="editDateMenu" :close-on-content-click="false">
                  <template #activator="{ props }">
                    <v-text-field
                      v-bind="props"
                      v-model="form.startDate"
                      label="New Hire Start Date"
                      readonly
                      prepend-inner-icon="mdi-calendar"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                    />
                  </template>
                  <v-date-picker @update:modelValue="date => form.startDate = dayjs(date).format('YYYY-MM-DD')" />
                </v-menu>
              </v-col>
            </template>
            <v-col cols="12" md="2">
              <v-btn type="submit" color="success" class="mt-2" block>
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
            clearable
            dense
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.department"
            label="Department"
            prepend-inner-icon="mdi-office-building"
            variant="outlined"
            clearable
            dense
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.jobTitle"
            label="Job Title"
            prepend-inner-icon="mdi-briefcase"
            variant="outlined"
            clearable
            dense
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.openingDate"
            label="Opening Date (YYYY-MM-DD)"
            prepend-inner-icon="mdi-calendar"
            variant="outlined"
            clearable
            dense
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.recruiter"
            label="Recruiter"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            clearable
            dense
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="filters.status"
            :items="['Vacant', 'Filled', 'Suspended', 'Cancel']"
            label="Status"
            variant="outlined"
            clearable
            dense
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.startDate"
            label="Start Date (YYYY-MM-DD)"
            prepend-inner-icon="mdi-calendar"
            variant="outlined"
            clearable
            dense
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.hiringCost"
            label="Hiring Cost"
            prepend-inner-icon="mdi-cash"
            type="number"
            variant="outlined"
            clearable
            dense
            hide-details
          />
        </v-col>
      </v-row>


      <!-- Table with Filters -->
      <div class="scroll-wrapper">
        <v-table height="550px" fixed-header class="elevation-1 rounded-lg">
          <thead class="custom-sticky-header">
            <tr>
              <th style="width: 60px">No</th>
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
            <tr v-for="(job, index) in paginatedRequisitions" :key="job._id">
              <td>{{ (page - 1) * itemsPerPage + index + 1 }}</td>
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
      </div >
      <v-row class="mt-4 d-flex align-center" justify="space-between">
        <v-col cols="12" md="6" class="d-flex align-center">
          <v-pagination
            v-model="page"
            :length="Math.ceil(filteredRequisitions.length / itemsPerPage)"
            total-visible="7"
            class="flex"
          />
        </v-col>

        <v-col cols="12" md="3" class="d-flex justify-end">
          <v-select
            v-model="itemsPerPage"
            :items="[25, 50, 75, 100]"
            label="Rows per page"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 180px"
          />
        </v-col>
        <v-overlay :model-value="showLoader" class="align-center justify-center" persistent>
          <div class="text-center">
            <v-progress-circular
              :model-value="loadValue"
              :rotate="360"
              :size="100"
              :width="15"
              color="teal"
            >
              <template v-slot:default>{{ loadValue }}%</template>
            </v-progress-circular>
          </div>
        </v-overlay>
      </v-row>
    </v-card>
  </v-container>
  
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import dayjs from 'dayjs'
import api from '@/utils/axios'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'

const dateMenu = ref(false)
const jobTitles = ref([])
const requisitions = ref([])
const page = ref(1)
const itemsPerPage = ref(25)
const recruiterList = ref([])
const showLoader = ref(true)
const loadValue = ref(0)

const paginatedRequisitions = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredRequisitions.value.slice(start, end)
})


const fetchRecruiters = async () => {
  try {
    const res = await api.get(`/recruiters?company=${company}`)
    recruiterList.value = res.data.map(r => r.name)
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Recruiter Load Failed', text: err?.response?.data?.message || 'Error fetching recruiters' })
  }
}

const showCreateForm = ref(false)
const showFilterForm = ref(false)

const role = localStorage.getItem('role') || ''
const company = localStorage.getItem('company') || ''

const filters = ref({
  jobId: '',
  department: '',
  jobTitle: '',
  openingDate: '',
  recruiter: '',
  status: '',
  startDate: '',
  hiringCost: ''
})

const filteredRequisitions = computed(() => {
  let base = []
  if (activeTab.value === 'White Collar') {
    base = requisitions.value.filter(j => j.type === 'White Collar')
  } else if (activeTab.value === 'Blue Collar Sewer') {
    base = requisitions.value.filter(j => j.type === 'Blue Collar' && j.subType === 'Sewer')
  } else {
    base = requisitions.value.filter(j => j.type === 'Blue Collar' && j.subType === 'Non-Sewer')
  }

  return base.filter(j =>
    (!filters.value.jobId ||
      j.jobRequisitionId?.toLowerCase().includes(filters.value.jobId.toLowerCase())) &&

    (!filters.value.department ||
      j.departmentName?.toLowerCase().includes(filters.value.department.toLowerCase())) &&

    (!filters.value.jobTitle ||
      j.jobTitle?.toLowerCase().includes(filters.value.jobTitle.toLowerCase())) &&

    (!filters.value.openingDate ||
      dayjs(j.openingDate).format('YYYY-MM-DD').toLowerCase().includes(filters.value.openingDate.toLowerCase()) ||
      dayjs(j.openingDate).format('DD-MMM-YYYY').toLowerCase().includes(filters.value.openingDate.toLowerCase()) ||
      dayjs(j.openingDate).format('MMM-YY').toLowerCase().includes(filters.value.openingDate.toLowerCase()) ||
      dayjs(j.openingDate).format('MMM-YYYY').toLowerCase().includes(filters.value.openingDate.toLowerCase())) &&

    (!filters.value.recruiter ||
      j.recruiter?.toLowerCase().includes(filters.value.recruiter.toLowerCase())) &&

    (!filters.value.status ||
      j.status === filters.value.status) &&

    (!filters.value.startDate ||
      dayjs(j.startDate).format('YYYY-MM-DD').toLowerCase().includes(filters.value.startDate.toLowerCase()) ||
      dayjs(j.startDate).format('DD-MMM-YYYY').toLowerCase().includes(filters.value.startDate.toLowerCase()) ||
      dayjs(j.startDate).format('MMM-YY').toLowerCase().includes(filters.value.startDate.toLowerCase()) ||
      dayjs(j.startDate).format('MMM-YYYY').toLowerCase().includes(filters.value.startDate.toLowerCase())) &&

    (!filters.value.hiringCost ||
      String(j.hiringCost).includes(filters.value.hiringCost))
  )

})



const form = ref({
  jobTitle: '',
  recruiter: '',
  targetCandidates: 1,
  openingDate: '',
  hiringCost: '',
  startDate: '',
  status: 'Vacant'
})


const alerts = ref({
  'White Collar': false,
  'Blue Collar Sewer': false,
  'Blue Collar Non-Sewer': false
})
const activeTab = ref('White Collar')

const fetchJobTitles = async () => {
  try {
    const company = localStorage.getItem('company');
    const res = await api.get(`/job-requisitions/job-titles?company=${company}`);
    jobTitles.value = res.data.jobTitles;
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Failed to Load Job Titles',
      text: err?.response?.data?.message || 'Error loading job titles'
    });
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
  Vacant: 'blue',
  Filled: 'green',
  Suspended: 'orange',
  Cancel: 'red'
}[status] || 'grey-lighten-3')

const getAlertKey = (entry) => {
  if (entry.type === 'White Collar') return 'White Collar'
  if (entry.type === 'Blue Collar' && entry.subType === 'Sewer') return 'Blue Collar Sewer'
  return 'Blue Collar Non-Sewer'
}



// placeholder for edit/delete

const isEditing = ref(false)
const editId = ref(null)
const editDateMenu = ref(false)
const editJob = (job) => {
  isEditing.value = true
  showCreateForm.value = true

  // ✅ Reset form first
  form.value = {
    jobTitle: '',
    recruiter: '',
    targetCandidates: 1,
    openingDate: '',
    hiringCost: '',
    startDate: '',
    status: 'Vacant',
    departmentId: '',
    departmentName: '',
    type: '',
    subType: ''
  }

  // ✅ Now assign new values from selected job
  editId.value = job._id
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
    status: job.status
  }
}


const updateRequisition = async () => {
  try {
    await api.put(`/job-requisitions/${editId.value}`, form.value)
    await Swal.fire({ icon: 'success', title: 'Updated', text: 'Requisition updated' })

    // ✅ Reset state after update
    isEditing.value = false
    showCreateForm.value = false  // optional: hide form after update
    form.value = {
      jobTitle: '',
      recruiter: '',
      targetCandidates: 1,
      openingDate: '',
      hiringCost: '',
      startDate: '',
      status: 'Vacant'
    }

    fetchRequisitions()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Update Failed', text: err?.response?.data?.message || 'Error updating requisition' })
  }
}


const deleteJob = async (job) => {
  const confirm = await Swal.fire({
    icon: 'warning',
    title: 'Confirm Deletion',
    text: `Are you sure you want to delete ${job.jobRequisitionId}?`,
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel'
  });

  if (confirm.isConfirmed) {
    try {
      await api.delete(`/job-requisitions/${job._id}`);
      await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Requisition deleted' });
      fetchRequisitions(); // reload the list
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err?.response?.data?.message || 'Error deleting requisition'
      });
    }
  }
};


const exportToExcel = () => {
  const exportData = filteredRequisitions.value.map((job, index) => ({
    No: index + 1,
    'Job ID': job.jobRequisitionId,
    Department: job.departmentName,
    'Job Title': job.jobTitle,
    'Opening Date': dayjs(job.openingDate).format('DD-MMM-YYYY'),
    Recruiter: job.recruiter,
    Status: job.status,
    'New Hire Start Date': dayjs(job.startDate).format('DD-MMM-YYYY'),
    'Hiring Cost': job.hiringCost
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Requisitions')
  XLSX.writeFile(workbook, `JobRequisitions_${dayjs().format('YYYY-MM-DD')}.xlsx`)
}



onMounted(() => {
  let interval = setInterval(() => {
    if (loadValue.value >= 100) {
      showLoader.value = false
      clearInterval(interval)
    } else {
      loadValue.value += 20
    }
  }, 10)

  fetchJobTitles()
  fetchRequisitions()
  fetchRecruiters()
  for (const key in alerts.value) {
    alerts.value[key] = localStorage.getItem(`seen_${key}`) !== 'true'
  }
})


</script>


<style scoped>

.v-table tbody tr:hover {
  background-color: #e3f2fd;  /* Light blue hover */
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.v-table tbody td {
  transition: background-color 0.2s ease;
}

</style>
