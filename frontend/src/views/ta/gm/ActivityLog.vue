<template>
  <v-container fluid>
    <v-card class="pa-4">
      <h2 class="text-h6 font-weight-bold mb-4">📄 Activity Log (GM Only)</h2>

      <!-- Filters -->
      <v-row class="mb-4" dense>
        <v-col cols="12" sm="4" md="3">
          <v-text-field
            v-model="search"
            label="Search..."
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="4" md="3">
          <v-select
            v-model="selectedCollection"
            :items="collectionOptions"
            label="Model"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="12" sm="4" md="3">
          <v-select
            v-model="selectedAction"
            :items="['CREATE', 'UPDATE', 'DELETE', 'RESTORE']"
            label="Action"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="12" sm="4" md="3">
          <v-select
            v-model="selectedUser"
            :items="userOptions"
            item-title="title"
            item-value="value"
            label="Filter by User"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-text-field
            v-model="startDate"
            label="From Date"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-text-field
            v-model="endDate"
            label="To Date"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>

      <!-- Table -->
      <v-data-table
        :headers="headers"
        :items="filteredLogs"
        :search="search"
        class="elevation-1"
        items-per-page-text="Items per page"
        :item-class="getRowClass"
        hover
      >
        <template #item.performedAt="{ item }">
          {{ formatDate(item.performedAt) }}
        </template>

        <template #item.details="{ item }">
          <v-btn size="small" variant="text" color="primary" @click="viewDetails(item)">
            View
          </v-btn>
        </template>

        <template #item.restore="{ item }">
          <v-btn
            v-if="item.actionType === 'DELETE' && !restoredIds.includes(item._id)"
            size="small"
            color="green"
            variant="text"
            @click="restoreItem(item)"
          >
            Restore
          </v-btn>
          <span
            v-else-if="item.actionType === 'DELETE'"
            class="text-grey text-caption font-italic"
          >
            Restored
          </span>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

// State
const logs = ref([])
const search = ref('')
const selectedCompany = ref(localStorage.getItem('company') || 'CAM-TAC')
const selectedCollection = ref(null)
const selectedAction = ref(null)
const selectedUser = ref(null)
const startDate = ref('')
const endDate = ref('')
const restoredIds = ref([])
const userOptions = ref([])

const collectionOptions = ['Candidate', 'JobRequisition', 'Department', 'Recruiter', 'Roadmap']

const headers = [
  { title: 'Date', value: 'performedAt' },
  { title: 'Action', value: 'actionType' },
  { title: 'Model', value: 'collectionName' },
  { title: 'User', value: 'performedBy' },
  { title: 'Details', value: 'details', sortable: false },
  { title: 'Restore', value: 'restore', sortable: false }
]

// API calls
const fetchLogs = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/activity-logs?company=${selectedCompany.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    logs.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('❌ Failed to fetch logs:', err)
  }
}

const fetchUserEmails = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/users/emails', {
      headers: { Authorization: `Bearer ${token}` }
    })

    userOptions.value = res.data.map(user => ({
      title: `${user.name} (${user.email})`,
      value: user.email
    }))
  } catch (err) {
    console.error('❌ Failed to fetch users:', err)
  }
}

// Computed filter
const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    const inModel = !selectedCollection.value || log.collectionName === selectedCollection.value
    const inAction = !selectedAction.value || log.actionType === selectedAction.value
    const inUser = !selectedUser.value || log.performedBy === selectedUser.value
    const logDate = dayjs(log.performedAt)
    const inDate =
      (!startDate.value || logDate.isAfter(dayjs(startDate.value).subtract(1, 'day'))) &&
      (!endDate.value || logDate.isBefore(dayjs(endDate.value).add(1, 'day')))
    return inModel && inAction && inUser && inDate
  })
})

// Utils
const formatDate = (dateStr) => dayjs(dateStr).format('YYYY-MM-DD HH:mm')

const viewDetails = (log) => {
  Swal.fire({
    title: 'Activity Details',
    html: `<pre style="text-align:left">${JSON.stringify(log, null, 2)}</pre>`,
    width: 800
  })
}

const restoreItem = async (log) => {
  try {
    const confirm = await Swal.fire({
      title: 'Restore this item?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel'
    })

    if (!confirm.isConfirmed) return

    const token = localStorage.getItem('token')
    await axios.post(`/activity-logs/restore/${log._id}`, {
      collectionName: log.collectionName,
      previousData: log.previousData,
      company: log.company
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    Swal.fire('Restored!', 'This item has been restored.', 'success')
    restoredIds.value.push(log._id)
    fetchLogs()
  } catch (err) {
    console.error('Restore failed:', err)
    Swal.fire('Error', err.response?.data?.message || 'Restore failed', 'error')
  }
}

const getRowClass = (item) => {
  switch (item.actionType) {
    case 'DELETE': return 'bg-red-lighten-5'
    case 'CREATE': return 'bg-blue-lighten-5'
    case 'UPDATE': return 'bg-yellow-lighten-5'
    case 'RESTORE': return 'bg-green-lighten-5'
    default: return ''
  }
}

// Init
onMounted(() => {
  fetchLogs()
  fetchUserEmails()
})
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  background-color: #f9f9f9;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
</style>
