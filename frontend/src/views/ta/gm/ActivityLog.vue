<!-- views/ta/gm/ActivityLog.vue -->
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

        <template #item.actionType="{ item }">
          <v-chip
            :color="getActionColor(item.actionType)"
            variant="outlined"
            size="small"
            class="text-uppercase font-weight-bold"
          >
            {{ item.actionType }}
          </v-chip>
        </template>

        <template #item.details="{ item }">
          <v-btn
            size="small"
            variant="text"
            color="primary"
            @click="viewDetails(item)"
          >
            View
          </v-btn>
        </template>

        <template #item.restore="{ item }">
          <v-btn
            v-if="['DELETE', 'UPDATE'].includes(item.actionType) && !restoredIds.includes(item._id)"
            size="small"
            color="green"
            variant="text"
            @click="restoreItem(item)"
          >
            Restore
          </v-btn>
          <span
            v-else-if="['DELETE', 'UPDATE'].includes(item.actionType)"
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
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/* ---------- state ---------- */
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

/* ---------- table headers ---------- */
const headers = [
  { title: 'Date', value: 'performedAt' },
  { title: 'Action', value: 'actionType' },
  { title: 'Model', value: 'collectionName' },

  // ✅ New column
  { title: 'Candidate', value: 'candidateName' },

  { title: 'User', value: 'performedBy' },
  { title: 'Details', value: 'details', sortable: false },
  { title: 'Restore', value: 'restore', sortable: false }
]

/* ---------- API calls ---------- */
const fetchLogs = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/activity-logs?company=${selectedCompany.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const data = res.data || {}

    // backend: { page, limit, total, items }
    // inject candidateName for Candidate logs
    logs.value = Array.isArray(data.items)
      ? data.items.map(log => {
          let candidateName = ''

          if (log.collectionName === 'Candidate') {
            candidateName =
              (log.newData && log.newData.fullName) ||
              (log.previousData && log.previousData.fullName) ||
              ''
          }

          return {
            ...log,
            candidateName
          }
        })
      : []
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

/* ---------- filters ---------- */
const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    const inModel = !selectedCollection.value || log.collectionName === selectedCollection.value
    const inAction = !selectedAction.value || log.actionType === selectedAction.value
    const inUser = !selectedUser.value || log.performedBy === selectedUser.value

    const logDate = dayjs(log.performedAt).tz('Asia/Phnom_Penh')
    const inDate =
      (!startDate.value || logDate.isAfter(dayjs(startDate.value).subtract(1, 'day'))) &&
      (!endDate.value || logDate.isBefore(dayjs(endDate.value).add(1, 'day')))

    return inModel && inAction && inUser && inDate
  })
})

/* ---------- helpers ---------- */
const formatDate = (dateStr) =>
  dayjs(dateStr).tz('Asia/Phnom_Penh').format('dddd, YYYY-MM-DD HH:mm')

const formatDateValues = (obj) => {
  if (!obj || typeof obj !== 'object') return ''
  return Object.entries(obj)
    .map(([stage, dt]) => `${stage}: ${formatDate(dt)}`)
    .join('<br>')
}

const viewDetails = (log) => {
  const previous = log.previousData || {}
  const current = log.newData || {}
  const allKeys = Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]))

  const rows = allKeys
    .map(key => {
      let oldVal = previous[key] ?? ''
      let newVal = current[key] ?? ''

      if (key === 'progressDates') {
        oldVal = formatDateValues(oldVal)
        newVal = formatDateValues(newVal)
      }

      if (key === 'createdAt' || key === 'updatedAt') {
        oldVal = oldVal ? formatDate(oldVal) : ''
        newVal = newVal ? formatDate(newVal) : ''
      }

      const isDiff = JSON.stringify(oldVal) !== JSON.stringify(newVal)

      return `
        <tr>
          <td style="padding: 8px 12px; background:#f8f8f8; font-weight: 500;">${key}</td>
          <td style="padding: 8px 12px; border-left: 1px solid #eee; ${
            isDiff ? 'color: red; font-weight: 600;' : ''
          }">${oldVal}</td>
          <td style="padding: 8px 12px; border-left: 1px solid #eee; ${
            isDiff ? 'color: red; font-weight: 600;' : ''
          }">${newVal}</td>
        </tr>
      `
    })
    .join('')

  Swal.fire({
    title: '📝 Activity Details',
    html: `
      <div style="text-align:left; border:1px solid #eee; border-radius:8px; padding:0;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding: 10px 12px; text-align: left;">Field</th>
              <th style="padding: 10px 12px; text-align: left;">Before</th>
              <th style="padding: 10px 12px; text-align: left;">After</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
    width: 800,
    confirmButtonText: 'Close',
    customClass: { popup: 'rounded-md' }
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
    await axios.post(
      `/activity-logs/restore/${log._id}`,
      {
        collectionName: log.collectionName,
        previousData: log.previousData,
        company: log.company
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

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
    case 'DELETE':
      return 'bg-red-lighten-5'
    case 'CREATE':
      return 'bg-blue-lighten-5'
    case 'UPDATE':
      return 'bg-yellow-lighten-5'
    case 'RESTORE':
      return 'bg-green-lighten-5'
    default:
      return ''
  }
}

const getActionColor = (action) => {
  switch (action) {
    case 'CREATE':
      return 'blue'
    case 'UPDATE':
      return 'orange'
    case 'DELETE':
      return 'red'
    case 'RESTORE':
      return 'green'
    default:
      return 'grey'
  }
}

/* ---------- lifecycle ---------- */
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

.v-data-table .v-chip {
  border-width: 1.5px;
  letter-spacing: 0.5px;
}
</style>
