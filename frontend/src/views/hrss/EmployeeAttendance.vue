<template>
  <v-container fluid class="pa-4">
    <v-card class="mb-4 elevation-1 rounded-2xl">
      <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl" title="Attendance Record">
        <template #append>
          <v-btn variant="flat" color="white" @click="fetchData">
            <v-icon start>mdi-refresh</v-icon> Refresh
          </v-btn>
        </template>
      </v-toolbar>

      <!-- Top Bar -->
      <div class="pa-4">
        <v-row align="center" justify="space-between" dense>
          <v-col cols="12" sm="5" md="4">
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
              variant="elevated"
              class="rounded-xl"
            >
              <v-icon start>mdi-database-import</v-icon> Import Attendance
            </v-btn>
          </v-col>

          <!-- Customize Calendar -->
          <v-col cols="12" sm="3" md="3">
            <v-btn
              block
              variant="tonal"
              color="warning"
              class="rounded-xl"
              @click="calendarDialog = true"
            >
              <v-icon start>mdi-calendar-cog</v-icon>
              Customize Calendar
            </v-btn>
          </v-col>
        </v-row>

        <!-- Filters -->
        <v-row class="mt-1" dense>
          <v-col cols="12" sm="3">
            <v-select
              v-model="selectedShift"
              :items="['All', 'Day Shift', 'Night Shift']"
              label="Shift Type"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>

          <v-col cols="12" sm="4">
            <v-text-field
              v-model="searchText"
              label="Search employee (ID/Name)"
              append-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
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
                  hide-details
                />
              </template>
              <v-date-picker
                v-model="selectedDate"
                @update:modelValue="onDateChange"
              />
            </v-menu>
          </v-col>
        </v-row>
      </div>
    </v-card>

    <!-- Monthly Heatmap (GitHub-style) -->
    <AttendanceHeatmap :date="selectedDate" class="mb-4" @reload="fetchData" />

    <!-- Actions -->
    <v-card class="mb-3 elevation-1 rounded-2xl">
      <div class="pa-3">
        <v-row align="center" justify="start" dense>
          <v-col cols="auto">
            <v-btn
              color="secondary"
              :disabled="selectedRows.length !== 1"
              @click="startEvaluation"
              class="rounded-xl"
            >
              <v-icon start>mdi-account-check</v-icon> Evaluate
            </v-btn>
          </v-col>

          <v-col cols="auto">
            <v-btn color="primary" :disabled="selectedRows.length !== 1" class="rounded-xl" @click="editSelected">
              <v-icon start>mdi-pencil</v-icon> Edit
            </v-btn>
          </v-col>

          <v-col cols="auto">
            <v-btn color="error" :disabled="selectedRows.length === 0" class="rounded-xl" @click="deleteSelected">
              <v-icon start>mdi-delete</v-icon> Delete
            </v-btn>
          </v-col>
        </v-row>
      </div>
    </v-card>

    <!-- Edit Attendance Dialog -->
    <v-dialog v-model="editDialog" max-width="640">
      <v-card class="rounded-2xl">
        <v-card-title class="text-h6 font-weight-bold">
          ✏️ Edit Attendance
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="editForm.fullName" label="Full Name" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="editForm.employeeId" label="Employee ID" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="editForm.date" label="Date" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="editForm.status"
                :items="['OnTime', 'Late', 'Overtime', 'Absent', 'Leave']"
                label="Status"
              />
            </v-col>
            <v-col cols="12" v-if="editForm.status === 'Leave'">
              <v-text-field v-model="editForm.leaveType" label="Type of Leave" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="editForm.riskStatus"
                :items="['None', 'NearlyAbandon', 'Abandon', 'Risk', 'Evaluated1', 'Evaluated2']"
                label="Risk Status"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model.number="editForm.overtimeHours" type="number" label="Overtime Hours" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="editForm.note" label="Note" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="editLoading" @click="submitEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Attendance Table -->
    <v-card class="elevation-1 rounded-2xl">
      <div class="table-scroll-wrapper">
        <table class="scrollable-table">
          <thead>
            <tr>
              <th class="sticky-col">
                <v-checkbox
                  v-model="allSelected"
                  :indeterminate="isIndeterminate"
                  hide-details
                  density="compact"
                />
              </th>
              <th class="sticky-col">#</th>
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
            <tr
              v-for="(item, index) in filteredAttendance"
              :key="item._id"
              :class="['zebra', animateRow(item.status)]"
            >
              <td class="sticky-col">
                <v-checkbox
                  v-model="selectedRows"
                  :value="item._id"
                  hide-details
                  density="compact"
                />
              </td>
              <td class="sticky-col">{{ index + 1 }}</td>
              <td>{{ formatDate(item.date) }}</td>
              <td>{{ item.employeeId }}</td>
              <td>{{ item.fullName }}</td>
              <td>{{ item.department || '-' }}</td>
              <td>{{ item.position || '-' }}</td>
              <td>{{ item.line || '-' }}</td>
              <td>{{ formatTime(item.timeIn) }}</td>
              <td>{{ formatTime(item.timeOut) }}</td>
              <td>{{ item.shiftType }}</td>
              <td><v-chip :color="statusColor(item.status)" variant="flat" density="comfortable">{{ formatStatus(item.status) }}</v-chip></td>
              <td><v-chip :color="riskColor(item.riskStatus)" variant="flat" density="comfortable">{{ formatRiskStatus(item.riskStatus) }}</v-chip></td>
              <td><v-chip :color="evaluateColor(item.evaluate)" variant="flat" density="comfortable">{{ formatEvaluate(item.evaluate) }}</v-chip></td>
              <td>{{ getLateMinutes(item.timeIn, item.shiftType) }}</td>
              <td>{{ getOvertimeHours(item.timeOut, item.shiftType) }}</td>
              <td>
                <span v-if="item.status === 'Leave'">{{ item.leaveType || '-' }}</span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="isLoading" class="loading-overlay">
          <DotLottieVue
            style="height: 200px; width: 200px;"
            autoplay
            loop
            src="https://lottie.host/b3e4008f-9dbd-4b76-b13e-e1cdb52f6190/3JhAvD9aX1.json" />
        </div>
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

    <!-- Customize Calendar dialog -->
    <WorkCalendarDialog v-model="calendarDialog" @saved="onCalendarSaved" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from '@/utils/axios'
import dayjs from '@/plugins/dayjs'
import * as XLSX from 'xlsx'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import Swal from 'sweetalert2'
import { useRouter } from 'vue-router'

// Components
import AttendanceHeatmap from '@/components/hrss/AttendanceHeatmap.vue'
import WorkCalendarDialog from '@/components/hrss/WorkCalendarDialog.vue'

const router = useRouter();
const excelFile = ref(null)
const attendance = ref([])
const searchText = ref('')
const selectedShift = ref('All')
const datePicker = ref(false)
const selectedRows = ref([])
const isLoading = ref(true)
const editDialog = ref(false)
const editLoading = ref(false)
const calendarDialog = ref(false)

const selectedDate = ref(dayjs().format('YYYY-MM-DD')) // PHN local today

const editForm = ref({
  _id: '', employeeId: '', fullName: '', date: '',
  status: '', leaveType: '', riskStatus: 'None', overtimeHours: 0, note: ''
})
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = ref('50')

// UI helpers
const animateRow = (status) => {
  if (status === 'NearlyAbandon' || status === 'Abandon') return 'shake-animation'
  if (status === 'Risk') return 'risk-highlight'
  return ''
}

const formattedDate = computed(() =>
  selectedDate.value ? dayjs(selectedDate.value).format('YYYY-MM-DD') : ''
)

const fetchData = async () => {
  try {
    isLoading.value = true
    const res = await axios.get('/attendance/paginated', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        date: selectedDate.value ? dayjs(selectedDate.value).format('YYYY-MM-DD') : undefined,
      },
    })
    attendance.value = Array.isArray(res.data.records) ? res.data.records : []
    totalPages.value = res.data.totalPages || 1
  } catch (err) {
    console.error('❌ Fetch error:', err.message)
    attendance.value = []
    totalPages.value = 1
  } finally {
    isLoading.value = false
  }
}

const onPageChange = (newPage) => { currentPage.value = newPage; fetchData() }
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }
const onDateChange = () => { datePicker.value = false; fetchData() }

onMounted(() => {
  fetchData()
  window.addEventListener('companyChanged', onCompanyChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('companyChanged', onCompanyChange)
})
const onCompanyChange = () => { fetchData() }

const filteredAttendance = computed(() =>
  attendance.value.filter(row => {
    const matchShift = selectedShift.value === 'All' || row.shiftType === selectedShift.value
    const q = (searchText.value || '').toLowerCase()
    const matchName = row.employeeId?.toLowerCase().includes(q) || row.fullName?.toLowerCase().includes(q)
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
    case 'NearlyAbandon': return 'yellow-darken-2'
    case 'Abandon': return 'deep-orange-accent-4'
    case 'Risk': return 'pink-accent-4'
    default: return 'grey'
  }
}
const formatStatus = s => ({
  OnTime: 'On Time', Late: 'Late', Overtime: 'Overtime', Absent: 'Absent',
  Leave: 'Permission', NearlyAbandon: 'Nearly Abandon', Abandon: 'Abandon', Risk: 'Risk on Comeback'
}[s] || s)

const riskColor = (r) => ({
  NearlyAbandon: 'yellow-darken-2',
  Abandon: 'deep-orange-accent-4',
  Risk: 'pink-accent-4',
  Evaluated1: 'green-darken-1',
  Evaluated2: 'blue-darken-2'
}[r] || 'grey')

const formatRiskStatus = (r) => {
  if (!r || r === 'None') return '-'
  if (/^Evaluated/.test(r)) return r.replace('Evaluated', 'Evaluated (')
  return r
}

const evaluateColor = (e) => ({
  Evaluate1: 'green-darken-1',
  Evaluate2: 'blue-darken-2',
  Evaluate3: 'purple-darken-3'
}[e] || 'grey')
const formatEvaluate = (e) => (!e || e === 'None') ? '-' : e.replace('Evaluate', 'Evaluation ')

// PHN-late/OT helpers
const getLateMinutes = (timeIn, shiftType) => {
  if (!timeIn) return '-'
  const actual = dayjs(timeIn)
  const expected = shiftType === 'Night Shift'
    ? dayjs(timeIn).hour(18).minute(0)
    : dayjs(timeIn).hour(7).minute(0)
  const diff = actual.diff(expected.add(15, 'minute'), 'minute')
  if (diff <= 0) return 'On Time'
  const h = Math.floor(diff / 60), m = diff % 60
  return h > 0 ? `${h} hr ${m} min` : `${m} min`
}

const getOvertimeHours = (timeOut, shiftType) => {
  if (!timeOut) return '-'
  const actual = dayjs(timeOut)
  const expected = shiftType === 'Night Shift'
    ? dayjs(timeOut).hour(3).minute(0).add(1, 'minute')
    : dayjs(timeOut).hour(16).minute(0).add(1, 'minute')
  const diff = actual.diff(expected, 'minute')
  if (diff <= 0) return 'No'
  const h = Math.floor(diff / 60), m = diff % 60
  return h > 0 ? `${h} hr ${m} min` : `${m} min`
}

// VALIDATE ➜ CONFIRM ➜ COMMIT importer
const handleImport = async () => {
  // helper: Excel serial time/JS date -> "HH:mm"
  const toHHmm = (v) => {
    if (v == null || v === '') return '';
    if (typeof v === 'number') {
      // Excel time is a fraction of a day
      const totalMinutes = Math.round(v * 24 * 60);
      const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const mm = String(totalMinutes % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    // Strings like "7:05", "07:05", "07:05:00"
    const m = String(v).trim().match(/^(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  };

  try {
    const file = excelFile.value;
    if (!file) return;

    isLoading.value = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet);

        if (!rawRows.length) {
          isLoading.value = false;
          return Swal.fire('Empty file', 'No rows to import.', 'warning');
        }

        // Auto-set selected date (Cambodia / Phnom Penh)
        const firstDateCell = rawRows[0]?.date;
        if (firstDateCell !== undefined) {
          let parsed;
          if (typeof firstDateCell === 'number') {
            const jsDate = new Date(Math.round((firstDateCell - 25569) * 86400 * 1000));
            parsed = dayjs(jsDate);
          } else {
            parsed = dayjs(firstDateCell);
          }
          if (parsed.isValid()) selectedDate.value = parsed.format('YYYY-MM-DD');
        }

        // Normalize rows for API
        const preparedRows = rawRows.map(r => ({
          employeeId: (r.employeeId || '').trim(),
          fullName: (r.fullName || r.name || '').trim(),
          date: r.date,                                // number or 'YYYY-MM-DD' (backend handles)
          startTime: toHHmm(r.startTime),              // normalize to "HH:mm"
          endTime: toHHmm(r.endTime),
          leaveType: (r.leaveType || '').trim(),
        }));

        // 1) VALIDATE (no writes)
        const validatePayload = {
          mode: 'validate',
          shiftType: selectedShift.value === 'All' ? undefined : selectedShift.value,
          rows: preparedRows
        };

        let v;
        try {
          v = await axios.post('/attendance/import', validatePayload);
        } catch (err) {
          console.error('validate failed', err?.response?.data || err.message);
          throw new Error(err?.response?.data?.message || 'Validation failed');
        }

        const nonWorkingDay = v.data.nonWorkingDay;         // 'Sunday' | 'Holiday' | null
        const mismatches    = v.data.shiftMismatches || []; // [{employeeId, fullName, expectedShift, scannedShift, ...}]

        // If there’s nothing risky, commit immediately with safe defaults
        if (!nonWorkingDay && mismatches.length === 0) {
          // chunk & commit with default policy = 'expected'
          const chunk = (arr, size) => arr.reduce((acc, _, i) => {
            if (i % size === 0) acc.push(arr.slice(i, i + size));
            return acc;
          }, []);
          const chunks = chunk(preparedRows, 500);
          let total = 0;

          for (const part of chunks) {
            const payload = {
              mode: 'commit',
              allowMismatch: true,     // no mismatches anyway
              allowNonWorking: true,   // not non-working anyway
              mismatchPolicy: 'expected',
              shiftType: selectedShift.value === 'All' ? undefined : selectedShift.value,
              rows: part
            };
            const res = await axios.post('/attendance/import', payload);
            total += (res.data.summary || []).length;
          }

          await fetchData();
          excelFile.value = null;
          return Swal.fire('Imported', `Imported ${total} rows.`, 'success');
        }

        // 2) Ask user how to proceed
        const mismatchRowsHtml = mismatches.slice(0, 12).map(m => `
          <tr>
            <td>${m.employeeId || '-'}</td>
            <td>${m.fullName || '-'}</td>
            <td>${m.startTime || '-'}</td>
            <td>${m.endTime || '-'}</td>
            <td>${m.expectedShift || '-'}</td>
            <td>${m.scannedShift || '-'}</td>
          </tr>
        `).join('');

        const more = mismatches.length > 12
          ? `<tr><td colspan="6" style="text-align:center">...and ${mismatches.length - 12} more</td></tr>`
          : '';

        const warnNonWork = nonWorkingDay
          ? `<div style="padding:8px 12px; background:#fff6f6; border:1px solid #ffd1d1; border-radius:8px; margin-bottom:10px">
               The selected date is marked as <b>${nonWorkingDay}</b> in Work Calendar.
             </div>`
          : '';

        const { isConfirmed, value } = await Swal.fire({
          width: 900,
          title: 'Review before import',
          html: `
            ${warnNonWork}
            <div style="margin-bottom:10px">
              <b>${preparedRows.length}</b> rows detected.
            </div>
            ${mismatches.length ? `
              <div style="border:1px solid #eee; border-radius:8px; max-height:260px; overflow:auto; margin-bottom:10px">
                <table style="width:100%; font-size:12px; border-collapse:collapse">
                  <thead>
                    <tr style="background:#fafafa">
                      <th style="padding:6px; border-bottom:1px solid #eee">ID</th>
                      <th style="padding:6px; border-bottom:1px solid #eee">Name</th>
                      <th style="padding:6px; border-bottom:1px solid #eee">In</th>
                      <th style="padding:6px; border-bottom:1px solid #eee">Out</th>
                      <th style="padding:6px; border-bottom:1px solid #eee">Expected</th>
                      <th style="padding:6px; border-bottom:1px solid #eee">Scanned</th>
                    </tr>
                  </thead>
                  <tbody>${mismatchRowsHtml}${more}</tbody>
                </table>
              </div>
              <div style="display:flex; gap:18px; align-items:center; margin:10px 0 6px">
                <div style="font-weight:600">When shift mismatches:</div>
                <label style="display:flex; gap:8px; align-items:center; cursor:pointer">
                  <input type="radio" name="mpolicy" value="expected" checked>
                  <span>Keep <b>scheduled</b> shift (recommended)</span>
                </label>
                <label style="display:flex; gap:8px; align-items:center; cursor:pointer">
                  <input type="radio" name="mpolicy" value="scanned">
                  <span>Use <b>scanned</b> times to set shift</span>
                </label>
              </div>
            ` : ''}
            <div style="display:flex; gap:18px; margin-top:8px">
              ${nonWorkingDay ? `
                <label style="display:flex; gap:8px; align-items:center; cursor:pointer">
                  <input id="allow-nw" type="checkbox" checked>
                  <span>Allow import on ${nonWorkingDay}</span>
                </label>
              ` : ''}
              ${mismatches.length ? `
                <label style="display:flex; gap:8px; align-items:center; cursor:pointer">
                  <input id="allow-mm" type="checkbox" checked>
                  <span>Allow shift mismatches</span>
                </label>
              ` : ''}
            </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Import',
          cancelButtonText: 'Cancel',
          preConfirm: () => {
            const policy = (document.querySelector('input[name="mpolicy"]:checked')?.value) || 'expected';
            const allowNW = document.querySelector('#allow-nw') ? document.querySelector('#allow-nw').checked : true;
            const allowMM = document.querySelector('#allow-mm') ? document.querySelector('#allow-mm').checked : true;
            return { policy, allowNW, allowMM };
          }
        });

        if (!isConfirmed) { isLoading.value = false; return; }

        // 3) COMMIT with the chosen options
        const chunk = (arr, size) => arr.reduce((acc, _, i) => {
          if (i % size === 0) acc.push(arr.slice(i, i + size));
          return acc;
        }, []);
        const chunks = chunk(preparedRows, 500);
        let totalImported = 0;

        for (let i = 0; i < chunks.length; i++) {
          const payload = {
            mode: 'commit',
            allowMismatch: value.allowMM,
            allowNonWorking: value.allowNW,
            mismatchPolicy: value.policy, // 'expected' | 'scanned'
            shiftType: selectedShift.value === 'All' ? undefined : selectedShift.value,
            rows: chunks[i]
          };
          try {
            const res = await axios.post('/attendance/import', payload);
            totalImported += (res.data.summary || []).length;
          } catch (err) {
            // backend might send 409 if gates are not allowed
            const msg = err?.response?.data?.message || err.message;
            console.error(`Commit chunk ${i + 1} failed`, err?.response?.data || err.message);
            await Swal.fire('Import warning', msg, 'warning');
            // continue to next chunk
          }
        }

        await fetchData();
        excelFile.value = null;
        Swal.fire('Imported', `Imported ${totalImported} rows.`, 'success');
      } catch (err) {
        console.error('❌ Import failed:', err);
        Swal.fire('Import failed', err.message || 'Unknown error', 'error');
      } finally {
        isLoading.value = false;
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    isLoading.value = false;
    Swal.fire('Import failed', err.message, 'error');
  }
};


const allSelected = computed({
  get: () => selectedRows.value.length === filteredAttendance.value.length && filteredAttendance.value.length > 0,
  set: (value) => { selectedRows.value = value ? filteredAttendance.value.map(i => i._id) : [] },
})

const isIndeterminate = computed(() =>
  selectedRows.value.length > 0 && selectedRows.value.length < filteredAttendance.value.length
)

const editSelected = () => {
  if (selectedRows.value.length === 1) {
    const id = selectedRows.value[0]
    const record = attendance.value.find(item => item._id === id)
    if (record) {
      editForm.value = {
        _id: record._id,
        employeeId: record.employeeId,
        fullName: record.fullName,
        date: formatDate(record.date),
        status: record.status,
        leaveType: record.leaveType || '',
        riskStatus: record.riskStatus || 'None',
        overtimeHours: record.overtimeHours || 0,
        note: record.note || ''
      }
      editDialog.value = true
    }
  }
}

const submitEdit = async () => {
  try {
    editLoading.value = true
    const payload = {
      status: editForm.value.status,
      leaveType: editForm.value.status === 'Leave' ? editForm.value.leaveType : '',
      riskStatus: editForm.value.riskStatus || 'None',
      overtimeHours: editForm.value.overtimeHours || 0,
      note: editForm.value.note,
    }
    await axios.put(`/attendance/${editForm.value._id}`, payload)
    editDialog.value = false
    await fetchData()
  } catch (err) {
    console.error('❌ Update failed:', err.message)
  } finally {
    editLoading.value = false
  }
}

const deleteSelected = async () => {
  if (selectedRows.value.length === 0) return
  const confirmed = confirm(`Delete ${selectedRows.value.length} records?`)
  if (!confirmed) return
  try {
    await Promise.all(selectedRows.value.map(id => axios.delete(`/attendance/${id}`)))
    await fetchData()
    selectedRows.value = []
  } catch (err) {
    console.error('❌ Failed to delete selected:', err.message)
  }
}

const startEvaluation = () => {
  if (selectedRows.value.length === 1) {
    router.push(`/hrss/evaluate/${selectedRows.value[0]}`)
  } else {
    alert('Please select exactly one record to evaluate.')
  }
}

const onCalendarSaved = async () => {
  // Refresh heatmap + table after calendar changes
  await fetchData()
}
</script>

<style scoped>
.table-scroll-wrapper {
  position: relative;
  overflow-x: auto;
  max-width: 100%;
  border: 1px solid #e7e7e7;
  border-radius: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.scrollable-table {
  width: max-content;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.scrollable-table th {
  position: sticky;
  top: 0;
  background-color: #f8fafc;
  z-index: 2;
  font-weight: 600;
}

.scrollable-table th,
.scrollable-table td {
  border-bottom: 1px solid #eee;
  padding: 8px 12px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.scrollable-table tbody tr.zebra:nth-child(odd) {
  background-color: #fcfcfd;
}
.scrollable-table tbody tr:hover {
  background-color: #edf6ff;
  cursor: pointer;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: white;
  z-index: 3;
  box-shadow: 1px 0 0 #eee inset;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(1px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Animations */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-4px); }
}
.shake-animation {
  animation: shake 0.6s ease-in-out infinite;
  background-color: #ffe5e0;
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
