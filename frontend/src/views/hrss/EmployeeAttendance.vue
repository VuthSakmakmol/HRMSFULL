<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">🗓️ Attendance Record</h2>

    <!-- Top Bar -->
    <v-row class="mb-4" align-center="center" justify="space-between">
      <!-- Left: Refresh Button -->
      <v-col cols="12" sm="4" md="3">
        <v-btn color="primary" block @click="fetchData">
          <v-icon start>mdi-refresh</v-icon> Refresh Data
        </v-btn>
      </v-col>

      <!-- Middle: File Upload -->
      <v-col cols="12" sm="4" md="4">
        <v-file-input
          v-model="excelFile"
          accept=".xlsx"
          label="Select Excel File"
          variant="outlined"
          prepend-icon="mdi-upload"
          dense
          hide-details
          show-size
        />
      </v-col>

      <!-- Right: Import Button -->
      <v-col cols="12" sm="4" md="3">
        <v-btn
          color="success"
          block
          :disabled="!excelFile"
          @click="handleImport"
        >
          <v-icon start>mdi-database-import</v-icon> Import Attendance
        </v-btn>
      </v-col>
    </v-row>


    <!-- Filters -->
    <v-row class="mb-4" dense>
      <v-col cols="12" sm="3">
        <v-select v-model="selectedShift" :items="['All', 'Day Shift', 'Night Shift']" label="Shift Type" density="compact" variant="outlined" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="searchText" label="Search employee" append-inner-icon="mdi-magnify" density="compact" variant="outlined" />
      </v-col>
      <v-col cols="12" sm="3">
        <v-text-field
          v-model="formattedDate"
          label="Filter by Date"
          readonly
          append-inner-icon="mdi-calendar"
          density="compact"
          variant="outlined"
          @click="datePicker = true"
        />
        <v-menu v-model="datePicker" activator="parent" width="auto">
          <v-date-picker v-model="selectedDate" @update:modelValue="datePicker = false" />
        </v-menu>
      </v-col>
    </v-row>

    <!-- Attendance Table -->
    <v-card>
      <div class="table-scroll-wrapper">
        <table class="scrollable-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Employee ID</th>
              <th>Full Name</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Late By</th>
              <th>Overtime</th>
              <th>Permission</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in filteredAttendance" :key="item._id">
              <td>{{ index + 1 }}</td>
              <td>{{ item.employeeId }}</td>
              <td>{{ item.fullName }}</td>
              <td>{{ dayjs(item.date).format('YYYY-MM-DD') }}</td>
              <td>{{ formatTime(item.timeIn) }}</td>
              <td>{{ formatTime(item.timeOut) }}</td>
              <td>{{ item.shiftType }}</td>
              <td><v-chip :color="statusColor(item.status)" dark>{{ formatStatus(item.status) }}</v-chip></td>
              <td>{{ getLateMinutes(item.timeIn, item.shiftType) }}</td>
              <td>{{ getOvertimeHours(item.timeOut, item.shiftType) }}</td>
              <td>
                <v-btn
                  v-if="item.status === 'Absent'"
                  size="small"
                  color="blue"
                  @click="openPermissionDialog(item)"
                >
                  Request
                </v-btn>
                <span v-else-if="item.status === 'Permission'">{{ item.note }}</span>
                <span v-else>-</span>
              </td>

            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Approve or decline permission -->
      <v-dialog v-model="showPermissionDialog" max-width="400px">
        <v-card>
          <v-card-title>Request Permission</v-card-title>
          <v-card-text>
            <v-select
              v-model="permissionType"
              :items="leaveOptions"
              label="Select Leave Type"
              variant="outlined"
              dense
            />
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn color="grey" variant="text" @click="showPermissionDialog = false">Cancel</v-btn>
            <v-btn color="red" variant="text" @click="declinePermission">Decline</v-btn>
            <v-btn color="green" :disabled="!permissionType" @click="approvePermission">Approve</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

const excelFile = ref(null)
const attendance = ref([])
const searchText = ref('')
const selectedShift = ref('All')
const selectedDate = ref(null)
const datePicker = ref(false)

const fetchData = async () => {
  try {
    const res = await axios.get('/attendance')
    if (Array.isArray(res.data)) {
      attendance.value = res.data
      console.log(`✅ Attendance loaded: ${attendance.value.length} records`)
    } else {
      console.warn('⚠️ Attendance fetch did not return an array:', res.data)
      attendance.value = []
    }
  } catch (err) {
    console.error('❌ Fetch error:', err.message)
    attendance.value = []
  }
}

onMounted(fetchData)

const formattedDate = computed(() => selectedDate.value ? dayjs(selectedDate.value).format('YYYY-MM-DD') : '')

const filteredAttendance = computed(() => {
  return attendance.value.filter(row => {
    const matchShift = selectedShift.value === 'All' || row.shiftType === selectedShift.value
    const matchName = row.employeeId?.toLowerCase().includes(searchText.value.toLowerCase()) || row.fullName?.toLowerCase().includes(searchText.value.toLowerCase())
    const matchDate = !selectedDate.value || dayjs(row.date).isSame(selectedDate.value, 'day')
    return matchShift && matchName && matchDate
  })
})

const formatTime = (val) => {
  if (!val) return '-'
  return dayjs(val).format('HH:mm')
}

const statusColor = (status) => {
  switch (status) {
    case 'OnTime': return 'green'
    case 'Late': return 'orange'
    case 'Absent': return 'red'
    case 'Overtime': return 'purple'
    default: return 'grey'
  }
}

const formatStatus = (s) => s === 'OnTime' ? 'On Time' : s

const handleImport = async () => {
  try {
    const file = excelFile.value
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      const res = await axios.post('/attendance/import', {
        shiftType: selectedShift.value === 'All' ? 'Day Shift' : selectedShift.value,
        rows
      })

      await fetchData()
      excelFile.value = null
      console.log('✅ Import success:', res.data)
    }
    reader.readAsArrayBuffer(file)
  } catch (err) {
    console.error('❌ Import failed:', err.message)
  }
}

//=======Late=========
const getLateMinutes = (timeIn, shiftType) => {
  if (!timeIn) return '-'

  const actual = dayjs(timeIn)
  const expected = shiftType === 'Night Shift'
    ? dayjs(timeIn).hour(18).minute(0)
    : dayjs(timeIn).hour(7).minute(0)

  const grace = 15
  const diff = actual.diff(expected.add(grace, 'minute'), 'minute')

  if (diff <= 0) return 'On Time'
  const hours = Math.floor(diff / 60)
  const mins = diff % 60

  return hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`
}


//====== over time =========
const getOvertimeHours = (timeOut, shiftType) => {
  if (!timeOut) return '-'

  const actual = dayjs(timeOut)

  const expected = shiftType === 'Night Shift'
    ? dayjs(timeOut).hour(3).minute(0).add(1, 'minute') // 03:01
    : dayjs(timeOut).hour(16).minute(0).add(1, 'minute') // 16:01

  // For night shift, adjust time if before 12pm
  if (shiftType === 'Night Shift' && actual.hour() < 12) actual.add(1, 'day')

  const diff = actual.diff(expected, 'minute')

  if (diff <= 0) return 'No'

  const hours = Math.floor(diff / 60)
  const mins = diff % 60

  return hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`
}

// ====== click to approve or decline permission =======
const selectedRecord = ref(null)
const showPermissionDialog = ref(false)
const permissionType = ref('')

const leaveOptions = ['Annual Leave', 'Sick Leave', 'Special Leave', 'Unpaid Leave', 'Paid Leave']

const openPermissionDialog = (record) => {
  selectedRecord.value = record
  permissionType.value = ''
  showPermissionDialog.value = true
}

const approvePermission = async () => {
  if (!selectedRecord.value) return

  try {
    await axios.put(`/attendance/${selectedRecord.value._id}`, {
      status: 'Permission',
      note: permissionType.value
    })
    selectedRecord.value.status = 'Permission'
    selectedRecord.value.note = permissionType.value
    showPermissionDialog.value = false
    console.log('✅ Permission approved')
  } catch (err) {
    console.error('❌ Failed to update permission:', err.message)
  }
}

const declinePermission = () => {
  showPermissionDialog.value = false
  console.log('❌ Permission declined, remains Absent')
}



</script>

<style scoped>
.table-scroll-wrapper {
  overflow-x: auto;
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 6px;
  max-height: 70vh;
  overflow-y: auto;
}

.scrollable-table {
  width: max-content;
  border-collapse: collapse;
  font-size: 13px;
}

.scrollable-table th {
  position: sticky;
  top: 0;
  background-color: #f9f9f9;
  z-index: 2;
}

.scrollable-table th,
.scrollable-table td {
  border: 1px solid #ccc;
  padding: 6px 10px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.scrollable-table tbody tr:hover {
  background-color: #dfedfc;
  cursor: pointer;
}
</style>
