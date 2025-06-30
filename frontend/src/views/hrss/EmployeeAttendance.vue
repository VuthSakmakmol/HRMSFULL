<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">🗓️ Attendance Record</h2>

    <!-- Top Bar -->
    <v-row class="mb-4" align-center justify="space-between">
      <v-col cols="12" sm="4" md="3">
        <v-btn color="primary" block @click="fetchData">
          <v-icon start>mdi-refresh</v-icon> Refresh Data
        </v-btn>
      </v-col>

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
      <!-- Import Leave Permission -->
      <v-row class="mb-4" align-center justify="space-between">
        <v-col cols="12" sm="4" md="4">
          <v-file-input
            v-model="leaveFile"
            accept=".xlsx"
            label="Update Leave File"
            variant="outlined"
            prepend-icon="mdi-upload"
            dense
            hide-details
            show-size
          />
        </v-col>
        <v-col cols="12" sm="4" md="3">
          <v-btn
            color="info"
            block
            :disabled="!leaveFile"
            @click="handleLeaveUpdate"
          >
            <v-icon start>mdi-calendar-check</v-icon> Update Leave
          </v-btn>
        </v-col>
      </v-row>
    </v-row>
    

    <!-- Filters -->
    <v-row class="mb-4" dense>
      <v-col cols="12" sm="3">
        <v-select
          v-model="selectedShift"
          :items="['All', 'Day Shift', 'Night Shift']"
          label="Shift Type"
          density="compact"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          v-model="searchText"
          label="Search employee"
          append-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="3">
        <v-menu v-model="datePicker" :close-on-content-click="false" transition="scale-transition" offset-y>
          <template #activator="{ props }">
            <v-text-field
              v-bind="props"
              v-model="formattedDate"
              label="Filter by Date"
              density="compact"
              variant="outlined"
              append-inner-icon="mdi-calendar"
              readonly
            />
          </template>
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
              <th>Type of Leave</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in filteredAttendance" :key="item._id">
              <td>{{ index + 1 }}</td>
              <td>{{ item.employeeId }}</td>
              <td>{{ item.fullName }}</td>
              <td>{{ formatDate(item.date) }}</td>
              <td>{{ formatTime(item.timeIn) }}</td>
              <td>{{ formatTime(item.timeOut) }}</td>
              <td>{{ item.shiftType }}</td>
              <td><v-chip :color="statusColor(item.status)" dark>{{ formatStatus(item.status) }}</v-chip></td>
              <td>{{ getLateMinutes(item.timeIn, item.shiftType) }}</td>
              <td>{{ getOvertimeHours(item.timeOut, item.shiftType) }}</td>
              <td>
                <span v-if="item.status === 'Leave'">{{ item.leaveType || '-' }}</span>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

const excelFile = ref(null)
const attendance = ref([])
const searchText = ref('')
const selectedShift = ref('All')
const selectedDate = ref(null)
const datePicker = ref(false)

// leave
const leaveFile = ref(null)

const formattedDate = computed(() =>
  selectedDate.value ? dayjs(selectedDate.value).format('YYYY-MM-DD') : ''
)

const fetchData = async () => {
  try {
    const res = await axios.get('/attendance')
    attendance.value = Array.isArray(res.data) ? res.data : []
    console.log(`✅ Attendance loaded: ${attendance.value.length} records`)
  } catch (err) {
    console.error('❌ Fetch error:', err.message)
    attendance.value = []
  }
}

onMounted(fetchData)

const filteredAttendance = computed(() =>
  attendance.value.filter(row => {
    const matchShift = selectedShift.value === 'All' || row.shiftType === selectedShift.value
    const matchName = row.employeeId?.toLowerCase().includes(searchText.value.toLowerCase()) ||
      row.fullName?.toLowerCase().includes(searchText.value.toLowerCase())
    const matchDate = !selectedDate.value || dayjs(row.date).isSame(selectedDate.value, 'day')
    return matchShift && matchName && matchDate
  })
)

const formatDate = val => (val ? dayjs(val).format('YYYY-MM-DD') : '-')
const formatTime = val => (val ? dayjs(val).format('HH:mm') : '-')

const statusColor = status => {
  switch (status) {
    case 'OnTime': return 'green'
    case 'Late': return 'orange'
    case 'Overtime': return 'purple'
    case 'Absent': return 'red'
    case 'Leave': return 'blue'
    default: return 'grey'
  }
}

const formatStatus = status =>
  status === 'OnTime' ? 'On Time' : (status === 'Leave' ? 'Permission' : status)

const getLateMinutes = (timeIn, shiftType) => {
  if (!timeIn) return '-'
  const actual = dayjs(timeIn)
  const expected = shiftType === 'Night Shift'
    ? dayjs(timeIn).hour(18).minute(0)
    : dayjs(timeIn).hour(7).minute(0)
  const diff = actual.diff(expected.add(15, 'minute'), 'minute')
  if (diff <= 0) return 'On Time'
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h} hr ${m} min` : `${m} min`
}

const getOvertimeHours = (timeOut, shiftType) => {
  if (!timeOut) return '-'
  const actual = dayjs(timeOut)
  const expected = shiftType === 'Night Shift'
    ? dayjs(timeOut).hour(3).minute(0).add(1, 'minute')
    : dayjs(timeOut).hour(16).minute(0).add(1, 'minute')
  if (shiftType === 'Night Shift' && actual.hour() < 12) actual.add(1, 'day')
  const diff = actual.diff(expected, 'minute')
  if (diff <= 0) return 'No'
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h} hr ${m} min` : `${m} min`
}

const handleImport = async () => {
  try {
    const file = excelFile.value;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Validate each row includes leaveType or empty string
      const preparedRows = rows.map(r => ({
        employeeId: r.employeeId?.trim() || '',
        date: r.date,
        startTime: r.startTime?.trim() || '',
        endTime: r.endTime?.trim() || '',
        leaveType: r.leaveType?.trim() || '',  // ✅ include leaveType in request
      }));

      const res = await axios.post('/attendance/import', {
        shiftType: selectedShift.value === 'All' ? 'Day Shift' : selectedShift.value,
        rows: preparedRows,
      });

      console.log('✅ Import result:', res.data);
      await fetchData();
      excelFile.value = null;
    };
    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
  }
};


const handleLeaveUpdate = async () => {
  try {
    const file = leaveFile.value
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      console.log('📤 Parsed rows:', rows); // <--- ADD THIS LINE

      const res = await axios.post('/attendance/import', {
        shiftType: selectedShift.value === 'All' ? 'Day Shift' : selectedShift.value,
        rows
      });

      console.log('✅ Import result:', res.data);
      await fetchData();
      excelFile.value = null;
    }
    reader.readAsArrayBuffer(file)
  } catch (err) {
    console.error('❌ Leave update failed:', err.message)
  }
}

// ✅ Auto-reload when company changes
const onCompanyChange = () => {
  console.log('🔄 Company changed, reloading attendance data...')
  fetchData()
}

onMounted(() => {
  window.addEventListener('companyChanged', onCompanyChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('companyChanged', onCompanyChange)
})
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
