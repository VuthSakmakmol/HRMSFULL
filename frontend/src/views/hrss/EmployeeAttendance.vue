<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">🗓️ Attendance Record</h2>

    <!-- Top Bar -->
    <v-row class="mb-4" align-center="center" justify="space-between" dense>
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
          density="comfortable"
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
    </v-row>

    <v-row class="mb-4" align-center="center" justify="start" dense>
      <v-col cols="auto">
        <v-btn
          color="secondary"
          :disabled="selectedRows.length !== 1"
          @click="startEvaluation"
        >
          <v-icon start>mdi-account-check</v-icon> Evaluate
        </v-btn>
      </v-col>

      <v-col cols="auto">
        <v-btn color="primary" :disabled="selectedRows.length !== 1" @click="editSelected">
          <v-icon start>mdi-pencil</v-icon> Edit
        </v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn color="error" :disabled="selectedRows.length === 0" @click="deleteSelected">
          <v-icon start>mdi-delete</v-icon> Delete
        </v-btn>
      </v-col>
    </v-row>

    
    <!-- Import Leave Permission -->
    <!-- <v-row class="mb-4" align-center justify="space-between">
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
    </v-row> -->

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
        <v-menu
          v-model="datePicker"
          :close-on-content-click="false"
          transition="scale-transition"
          offset-y
        >
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
          <v-date-picker
            v-model="selectedDate"
            @update:modelValue="onDateChange"
          />
        </v-menu>
      </v-col>
    </v-row>

    <!-- Edit Attendance Dialog -->
    <v-dialog v-model="editDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">
          ✏️ Edit Attendance
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="editForm.fullName" label="Full Name" readonly />
          <v-text-field v-model="editForm.employeeId" label="Employee ID" readonly />
          <v-text-field v-model="editForm.date" label="Date" readonly />
          <v-select
            v-model="editForm.status"
            :items="['OnTime', 'Late', 'Overtime', 'Absent', 'Leave']"
            label="Status"
          />
          <v-text-field v-if="editForm.status === 'Leave'" v-model="editForm.leaveType" label="Type of Leave" />
          <v-select
            v-model="editForm.riskStatus"
            :items="['None', 'NearlyAbandon', 'Abandon', 'Risk', 'Evaluated1', 'Evaluated2']"
            label="Risk Status"
          />

          <v-text-field
            v-model="editForm.overtimeHours"
            type="number"
            label="Overtime Hours"
          />
          <v-text-field v-model="editForm.note" label="Note" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="editLoading" @click="submitEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Attendance Table -->
    <v-card>
      
      <div class="table-scroll-wrapper">
        <table class="scrollable-table">
          <thead>
            <tr>
              <th>
                <v-checkbox
                  v-model="allSelected"
                  :indeterminate="isIndeterminate"
                  hide-details
                  density="compact"
                />
              </th>
              <th>#</th>
              <th>Date</th>
              <th>Employee ID</th>
              <th>Full Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Line</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Risk Status</th>
              <th>Evaluate</th>
              <th>Late By</th>
              <th>Overtime</th>
              <th>Type of Leave</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in filteredAttendance" :key="item._id" :class="animateRow(item.status)">

              <td>
                <v-checkbox
                  v-model="selectedRows"
                  :value="item._id"
                  hide-details
                  density="compact"
                />
              </td>
              <td>{{ index + 1 }}</td>
              <td>{{ formatDate(item.date) }}</td>                                
              <td>{{ item.employeeId }}</td>                                 
              <td>{{ item.fullName }}</td>                                 
              <td>{{ item.department || '-' }}</td>
              <td>{{ item.position || '-' }}</td>
              <td>{{ item.line || '-' }}</td>
              <td>{{ formatTime(item.timeIn) }}</td>
              <td>{{ formatTime(item.timeOut) }}</td>
              <td>{{ item.shiftType }}</td>
              <td><v-chip :color="statusColor(item.status)" dark>{{ formatStatus(item.status) }}</v-chip></td>
              <td><v-chip :color="riskColor(item.riskStatus)" dark>{{ formatRiskStatus(item.riskStatus) }}</v-chip></td>
              <td><v-chip :color="evaluateColor(item.evaluate)" dark>{{ formatEvaluate(item.evaluate) }}</v-chip></td>
              <td>{{ getLateMinutes(item.timeIn, item.shiftType) }}</td>
              <td>{{ getOvertimeHours(item.timeOut, item.shiftType) }}</td>
              <td>
                <span v-if="item.status === 'Leave'">{{ item.leaveType || '-' }}</span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
          <div v-if="isLoading" class="d-flex justify-center pa-8">
            <DotLottieVue
              style="height: 200px; width: 200px;"
              autoplay
              loop
              src="https://lottie.host/b3e4008f-9dbd-4b76-b13e-e1cdb52f6190/3JhAvD9aX1.json" />
          </div>
        </table>
      </div> 
    </v-card>
    <v-row align="center" justify="space-between" class="mt-2">
      <v-col cols="12" sm="6">
        <v-select
          v-model="pageSize"
          :items="['20', '50', '100', 'All']"
          label="Rows per page"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="onPageSizeChange"
        />
      </v-col>
      <v-col cols="12" sm="6" class="text-right">
        <v-pagination
          v-if="totalPages > 1"
          v-model="currentPage"
          :length="totalPages"
          density="comfortable"
          total-visible="5"
          @update:model-value="onPageChange"
        />
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from '@/utils/axios'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import Swal from 'sweetalert2'
import { useRouter } from 'vue-router';

const router = useRouter();
const excelFile = ref(null)
const attendance = ref([])
const searchText = ref('')
const selectedShift = ref('All')
const datePicker = ref(false)
const selectedRows = ref([]);
const isLoading = ref(true)
const editDialog = ref(false);
const selectedDate = ref(dayjs().format('YYYY-MM-DD')); // default to today
const editForm = ref({
  _id: '',
  employeeId: '',
  fullName: '',
  date: '',
  status: '',
  leaveType: '',
  note: ''
});
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = ref('50');

// animation
const animateRow = (status) => {
  if (status === 'NearlyAbandon' || status === 'Abandon') return 'shake-animation';
  if (status === 'Risk') return 'risk-highlight';
  return '';
};


// leave
const leaveFile = ref(null)

const formattedDate = computed(() =>
  selectedDate.value ? dayjs(selectedDate.value).format('YYYY-MM-DD') : ''
);

const fetchData = async () => {
  try {
    isLoading.value = true;
    const res = await axios.get('/attendance/paginated', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        date: selectedDate.value ? dayjs(selectedDate.value).format('YYYY-MM-DD') : undefined,
      },
    });
    attendance.value = Array.isArray(res.data.records) ? res.data.records : [];
    totalPages.value = res.data.totalPages || 1;
    console.log(`✅ Attendance loaded: ${attendance.value.length} records (Page ${currentPage.value}/${totalPages.value})`);
  } catch (err) {
    console.error('❌ Fetch error:', err.message);
    attendance.value = [];
    totalPages.value = 1;
  } finally {
    isLoading.value = false;
  }
};



const onPageChange = (newPage) => {
  currentPage.value = newPage;
  fetchData();
};

const onPageSizeChange = (newSize) => {
  currentPage.value = 1; // reset to first page
  fetchData();
};

const onDateChange = () => {
  datePicker.value = false; // close the menu
  console.log(`📅 Date filter changed: ${selectedDate.value}`);
  fetchData(); // reload attendance for the new date
};


onMounted(() => {
  fetchData()
})

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
    case 'OnTime': return 'green';
    case 'Late': return 'orange';
    case 'Overtime': return 'purple';
    case 'Absent': return 'red';
    case 'Leave': return 'blue';
    case 'NearlyAbandon': return 'yellow darken-2';   // bright warning
    case 'Abandon': return 'deep-orange accent-4';    // urgent red
    case 'Risk': return 'pink accent-4';              // eye-catching pink
    default: return 'grey';
  }
};


const formatStatus = status => {
  switch (status) {
    case 'OnTime': return 'On Time';
    case 'Late': return 'Late';
    case 'Overtime': return 'Overtime';
    case 'Absent': return 'Absent';
    case 'Leave': return 'Permission';
    case 'NearlyAbandon': return 'Nearly Abandon';
    case 'Abandon': return 'Abandon';
    case 'Risk': return 'Risk on Comeback';
    default: return status;
  }
};

// Risk Status
const riskColor = (riskStatus) => {
  switch (riskStatus) {
    case 'NearlyAbandon': return 'yellow darken-2';
    case 'Abandon': return 'deep-orange accent-4';
    case 'Risk': return 'pink accent-4';
    case 'Evaluated1': return 'green darken-1';
    case 'Evaluated2': return 'blue darken-2';
    default: return 'grey';
  }
};

const formatRiskStatus = (riskStatus) => {
  if (!riskStatus || riskStatus === 'None') return '-';
  if (/^Evaluated/.test(riskStatus)) return riskStatus.replace('Evaluated', 'Evaluated (');
  return riskStatus;
};

// Evaluate

const startEvaluation = () => {
  if (selectedRows.value.length === 1) {
    const id = selectedRows.value[0];
    router.push(`/hrss/evaluate/${id}`);
  } else {
    alert('Please select exactly one record to evaluate.');
  }
};



const evaluateColor = (evaluate) => {
  switch (evaluate) {
    case 'Evaluate1': return 'green darken-1';
    case 'Evaluate2': return 'blue darken-2';
    case 'Evaluate3': return 'purple darken-3';
    default: return 'grey';
  }
};

const formatEvaluate = (evaluate) => {
  if (!evaluate || evaluate === 'None') return '-';
  return evaluate.replace('Evaluate', 'Evaluation ');
};



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
    isLoading.value = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        console.warn('⚠️ Import file is empty.');
        isLoading.value = false;
        return;
      }

      // 🟢 Auto-select date from first row of the Excel file
      if (rows[0].date) {
      let firstDateParsed;

      // Check if date is a number (Excel serial date)
      if (!isNaN(rows[0].date)) {
        firstDateParsed = dayjs(new Date(Math.round((rows[0].date - 25569) * 86400 * 1000))); 
      } else {
        firstDateParsed = dayjs(rows[0].date);
      }

      if (firstDateParsed.isValid()) {
        const firstDate = firstDateParsed.format('YYYY-MM-DD');
        selectedDate.value = firstDate;
        console.log(`📅 Auto-set filter date to imported date: ${firstDate}`);
      } else {
        console.warn('⚠️ First row date invalid or missing, falling back to today.');
        selectedDate.value = dayjs().format('YYYY-MM-DD'); // fallback to today
      }
    } else {
      console.warn('⚠️ First row date missing, falling back to today.');
      selectedDate.value = dayjs().format('YYYY-MM-DD'); // fallback to today
    }


      // Prepare data rows for API
      const preparedRows = rows.map(r => ({
        employeeId: r.employeeId?.trim() || '',
        date: r.date,
        startTime: r.startTime?.trim() || '',
        endTime: r.endTime?.trim() || '',
        leaveType: r.leaveType?.trim() || '',
      }));

      // Chunk rows: 500 rows per request
      const chunkArray = (array, size) => {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size));
        }
        return result;
      };

      const chunks = chunkArray(preparedRows, 500);

      let totalImported = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🚚 Sending chunk ${i + 1}/${chunks.length} (${chunk.length} rows)`);

        try {
          const res = await axios.post('/attendance/import', {
            shiftType: selectedShift.value === 'All' ? 'Day Shift' : selectedShift.value,
            rows: chunk,
          });
          console.log(`✅ Chunk ${i + 1} imported:`, res.data);
          totalImported += res.data.summary.length;
        } catch (err) {
          console.error(`❌ Chunk ${i + 1} failed:`, err.message);
        }
      }

      console.log(`✅ Total attendance records imported: ${totalImported}`);
      await fetchData();
      excelFile.value = null;
    };

    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
  } finally {
    isLoading.value = false;
  }
};



const handleLeaveUpdate = async () => {
  try {
    const file = leaveFile.value;
    if (!file) return;

    isLoading.value = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        console.warn('⚠️ Leave file is empty.');
        isLoading.value = false;
        return;
      }

      // 🟢 Prepare rows with expected fields
      const preparedRows = rows.map(r => ({
        employeeId: r.employeeId?.trim() || '',
        date: r.date,
        shiftType: r.shiftType?.trim() || '',
        leaveType: r.leaveType?.trim() || '',
      }));

      // 🟢 Extract unique dates & employees
      const uniqueDates = [...new Set(preparedRows.map(r => dayjs(r.date).format('YYYY-MM-DD')))];
      const uniqueEmployees = [...new Set(preparedRows.map(r => r.employeeId))];

      if (uniqueDates.length > 1) {
        const confirmMsg = `⚠️ You are updating leave for multiple dates:\n\nDates: ${uniqueDates.join(', ')}\nEmployees: ${uniqueEmployees.join(', ')}\n\nAre you sure you want to overwrite existing leave records?`;
        const { isConfirmed } = await Swal.fire({
          title: 'Are you sure?',
          html: `<pre style="text-align:left;">${confirmMsg.replace(/\n/g, '<br>')}</pre>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, update',
          cancelButtonText: 'Cancel',
          customClass: { popup: 'swal2-overflow' },
          allowOutsideClick: false,
          allowEnterKey: true
        })

        if (!isConfirmed) {
          console.log('❌ Leave update cancelled by user.');
          leaveFile.value = null;
          isLoading.value = false;
          return;
        }
      }

      // 🟢 Chunk rows: 500 per request
      const chunkArray = (array, size) => {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size));
        }
        return result;
      };

      const chunks = chunkArray(preparedRows, 500);

      let totalProcessed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🚚 Sending leave chunk ${i + 1}/${chunks.length} (${chunk.length} rows)`);

        try {
          const res = await axios.post('/attendance/update-leave', {
            rows: chunk,
          });
          console.log(`✅ Leave chunk ${i + 1} processed:`, res.data);
          totalProcessed += res.data.result.length;
        } catch (err) {
          console.error(`❌ Leave chunk ${i + 1} failed:`, err.message);
        }
      }

      console.log(`✅ Total leave records processed: ${totalProcessed}`);
      await fetchData();
      leaveFile.value = null;
    };

    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error('❌ Leave update failed:', err.message);
  } finally {
    isLoading.value = false;
  }
};



const allSelected = computed({
  get: () => selectedRows.value.length === filteredAttendance.value.length && filteredAttendance.value.length > 0,
  set: (value) => {
    selectedRows.value = value ? filteredAttendance.value.map(item => item._id) : [];
  },
});

const isIndeterminate = computed(() =>
  selectedRows.value.length > 0 && selectedRows.value.length < filteredAttendance.value.length
);


const editSelected = () => {
  if (selectedRows.value.length === 1) {
    const id = selectedRows.value[0];
    const record = attendance.value.find(item => item._id === id);
    if (record) {
      editForm.value = {
        _id: record._id,
        employeeId: record.employeeId,
        fullName: record.fullName,
        date: formatDate(record.date),
        status: record.status,
        leaveType: record.leaveType || '',
        note: record.note || ''
      };
      editDialog.value = true;
    }
  }
};


const submitEdit = async () => {
  try {
    const payload = {
      status: editForm.value.status,
      leaveType: editForm.value.status === 'Leave' ? editForm.value.leaveType : '',
      riskStatus: editForm.value.riskStatus || 'None',
      overtimeHours: editForm.value.overtimeHours || 0,
      note: editForm.value.note,
    };
    const res = await axios.put(`/attendance/${editForm.value._id}`, payload);
    console.log('✅ Updated attendance:', res.data);
    editDialog.value = false;
    await fetchData();
  } catch (err) {
    console.error('❌ Update failed:', err.message);
  }
};


const deleteSelected = async () => {
  if (selectedRows.value.length === 0) return;
  const confirmed = confirm(`Delete ${selectedRows.value.length} records?`);
  if (!confirmed) return;
  try {
    await Promise.all(selectedRows.value.map(id =>
      axios.delete(`/attendance/${id}`)
    ));
    console.log('✅ Deleted selected records');
    await fetchData();
    selectedRows.value = [];
  } catch (err) {
    console.error('❌ Failed to delete selected:', err.message);
  }
};



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

// simulate loading
setTimeout(() => {
  isLoading.value = false
}, 2000)

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

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-4px); }
}

.shake-animation {
  animation: shake 0.6s ease-in-out infinite;
  background-color: #df7f5c; /* subtle yellow highlight */
}

@keyframes pulse {
  0% { background-color: #ffe6eb; }
  50% { background-color: #ffc2d4; }
  100% { background-color: #ffe6eb; }
}

.risk-highlight {
  animation: pulse 2s infinite;
}


</style>
