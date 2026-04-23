<!-- src/components/hrss/attendance/ImportAttendanceDialog.vue -->
<template>
  <v-dialog v-model="modelValueRef" max-width="900" scrollable>
    <v-card class="rounded-2xl">
      <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl">
        <v-toolbar-title>Import Attendance</v-toolbar-title>
        <v-spacer />
        <v-btn icon variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <!-- Step 1: Excel file -->
        <div class="mb-4">
          <div class="text-subtitle-1 mb-1">1) Select Excel file</div>
          <v-file-input
            v-model="file"
            label="Choose .xlsx / .xls / .csv"
            prepend-icon="mdi-file-excel"
            accept=".xlsx,.xls,.csv"
            density="comfortable"
            variant="outlined"
            :disabled="loading"
            clearable
          />
          <div class="text-caption text-medium-emphasis mt-1">
            Required columns:
            <code>employeeId</code>, <code>date</code>,
            <code>startTime</code>, <code>endTime</code>, <code>leaveType</code>
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            Supported date formats:
            <code>YYYY-MM-DD</code> (2026-02-03),
            <code>DD/MM/YYYY</code> (03/02/2026),
            <code>DD-MM-YYYY</code> (03-02-2026).
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            Supported time formats:
            <code>08:00</code>, <code>8:00</code>, <code>08.00</code>, <code>0800</code>
          </div>
        </div>

        <!-- Step 2: options -->
        <div class="mb-2">
          <v-switch
            v-model="allowNonWorking"
            color="primary"
            hide-details
            inset
            label="Allow import on Sunday/Holiday (override)"
          />
          <v-switch
            v-model="allowUnknown"
            color="deep-purple-accent-4"
            hide-details
            inset
            label="Allow Unknown Employees (import as Unknown)"
          />
        </div>

        <!-- Step 3: Preview -->
        <div v-if="previewRows.length" class="mt-4">
          <v-alert type="info" variant="tonal" class="mb-2">
            Previewing first {{ previewRows.length }} rows
          </v-alert>

          <v-table density="compact">
            <thead>
              <tr>
                <th style="width: 48px;">#</th>
                <th style="min-width: 140px;">Employee ID</th>
                <th style="min-width: 120px;">Date</th>
                <th style="min-width: 110px;">Time In</th>
                <th style="min-width: 110px;">Time Out</th>
                <th style="min-width: 140px;">Leave Type</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in previewRows" :key="i">
                <td>{{ i + 1 }}</td>
                <td>{{ r.employeeId }}</td>
                <td>{{ r.date }}</td>
                <td>{{ r.startTime }}</td>
                <td>{{ r.endTime }}</td>
                <td>{{ r.leaveType }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Step 4: Validation summary -->
        <div v-if="validateResult" class="mt-4">
          <v-alert
            :type="validateResult.ok ? 'success' : 'warning'"
            variant="tonal"
            class="mb-2"
          >
            <template v-if="validateResult.ok">
              ✅ Validation OK
              <span v-if="Array.isArray(validateResult.unknownEmployees) && validateResult.unknownEmployees.length">
                ({{ validateResult.unknownEmployees.length }} unknown employees)
              </span>
              <span v-if="validateResult.nonWorkingDay">
                • Non-working day: {{ validateResult.nonWorkingDay }}
              </span>
              <div class="text-caption mt-1">
                Rows in file: <b>{{ validateResult.totalRows ?? '-' }}</b>,
                Valid rows: <b>{{ validateResult.validRows ?? '-' }}</b>
              </div>
            </template>
            <template v-else>
              ⚠️ {{ validateResult.message || 'Validation failed' }}
            </template>
          </v-alert>

          <v-expansion-panels
            v-if="validateResult.ok && Array.isArray(validateResult.unknownEmployees) && validateResult.unknownEmployees.length"
            variant="accordion"
            class="mt-2"
          >
            <v-expansion-panel>
              <v-expansion-panel-title>
                Unknown Employees ({{ validateResult.unknownEmployees.length }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="id in validateResult.unknownEmployees"
                    :key="id"
                    size="small"
                    color="warning"
                    variant="tonal"
                  >
                    {{ id }}
                  </v-chip>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Close</v-btn>

        <v-btn
          color="info"
          :loading="loading"
          :disabled="!pickedFile"
          @click="onValidate"
        >
          <v-icon start>mdi-check-decagram</v-icon>
          Validate
        </v-btn>

        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!validateResult?.ok"
          @click="onCommit"
        >
          <v-icon start>mdi-database-import</v-icon>
          Commit Import
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import api from '@/utils/axios'

/* ───────── Props & Emits ───────── */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  selectedDate: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'done'])

const modelValueRef = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

/* ───────── State ───────── */
const loading = ref(false)
const file = ref(null) // Vuetify v-file-input can be File or [File]
const allowNonWorking = ref(false)
const allowUnknown = ref(true)
const validateResult = ref(null)
const previewRows = ref([])

/* ───────── Computed ───────── */
const pickedFile = computed(() => {
  if (!file.value) return null
  return Array.isArray(file.value) ? file.value[0] : file.value
})

/* ───────── Helpers ───────── */
function close() {
  modelValueRef.value = false
  resetForm()
}

function resetForm() {
  file.value = null
  allowNonWorking.value = false
  allowUnknown.value = true
  validateResult.value = null
  previewRows.value = []
}

watch(
  () => props.modelValue,
  (v) => {
    // When reopened, keep previous values? We reset only when closed.
    if (!v) resetForm()
  }
)

/* Normalize time for preview (matches your backend behavior) */
function normalizeExcelTime(str) {
  if (!str && str !== 0) return ''
  if (typeof str === 'number') {
    // Excel float time
    const totalMinutes = Math.round(str * 24 * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  str = String(str).trim()
  if (/^\d{3,4}$/.test(str)) {
    const h = str.slice(0, -2)
    const m = str.slice(-2)
    return `${h.padStart(2, '0')}:${m}`
  }
  if (/^\d{1,2}[.: ]\d{1,2}$/.test(str)) {
    const [h, m] = str.split(/[.: ]/)
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
  }
  if (/^\d{1,2}:\d{2}$/.test(str)) return str
  return ''
}

/**
 * Normalize date for preview.
 * Supports:
 * - Date objects from XLSX
 * - YYYY-MM-DD
 * - DD/MM/YYYY (03/02/2026)  ✅ default Cambodia style
 * - DD-MM-YYYY
 */
function normalizeExcelDate(v) {
  if (v == null || v === '') return ''

  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const s0 = String(v).trim()
  if (!s0) return ''

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s0)) return s0

  // Convert separators to '-'
  const s = s0.replace(/[./\\\s]+/g, '-')

  // YYYY-M-D
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`

  // D-M-YYYY (or ambiguous M-D-YYYY) -> default DD/MM
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmy) {
    const a = parseInt(dmy[1], 10)
    const b = parseInt(dmy[2], 10)
    const y = parseInt(dmy[3], 10)

    // Cambodia default: DD/MM
    let day = a
    let month = b

    // If clearly MM/DD (b>12 can't be month)
    if (a <= 12 && b > 12) {
      month = a
      day = b
    } else if (a > 12 && b <= 12) {
      day = a
      month = b
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return ''
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return ''
}

/* Parse Excel for preview (first 5 rows) */
async function parseExcelPreview() {
  if (!pickedFile.value) return []

  const buf = await pickedFile.value.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })

  return rows.slice(0, 5).map((r) => {
    // Lowercase keys for flexible header matching
    const k = Object.fromEntries(Object.entries(r).map(([kk, vv]) => [String(kk).toLowerCase().trim(), vv]))

    const employeeId = k.employeeid ?? k['employee id'] ?? k.id ?? ''
    const date = normalizeExcelDate(k.date ?? '')
    const startTime = normalizeExcelTime(k.starttime ?? k['start time'] ?? k.in ?? k.checkin ?? '')
    const endTime = normalizeExcelTime(k.endtime ?? k['end time'] ?? k.out ?? k.checkout ?? '')
    const leaveType = k.leavetype ?? k['leave type'] ?? ''

    return {
      employeeId: String(employeeId || '').trim(),
      date,
      startTime,
      endTime,
      leaveType: String(leaveType || '').trim(),
    }
  })
}

/* ───────── API Calls ───────── */
async function uploadFileToServer(mode = 'validate') {
  const f = pickedFile.value
  const form = new FormData()
  form.append('file', f)
  form.append('mode', mode)
  form.append('allowNonWorking', String(allowNonWorking.value))
  form.append('allowUnknown', String(allowUnknown.value))

  const { data } = await api.post('/attendance/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/* ───────── Validate ───────── */
async function onValidate() {
  try {
    loading.value = true
    validateResult.value = null
    previewRows.value = await parseExcelPreview()

    const data = await uploadFileToServer('validate')
    validateResult.value = data

    // If backend returns ok:false but 200, handle it
    if (data?.ok === false) {
      await Swal.fire({ icon: 'warning', title: 'Validation warning', text: data?.message || 'Validation warning' })
      return
    }

    await Swal.fire({
      icon: 'success',
      title: 'Validation OK',
      timer: 1200,
      showConfirmButton: false,
    })
  } catch (e) {
    const msg = e?.response?.data?.message || e.message || 'Validate failed'
    await Swal.fire({ icon: 'error', title: 'Validate failed', text: msg })
  } finally {
    loading.value = false
  }
}

/* ───────── Commit ───────── */
async function onCommit() {
  try {
    loading.value = true
    const data = await uploadFileToServer('commit')

    if (data?.ok === false) {
      await Swal.fire({ icon: 'error', title: 'Import blocked', text: data?.message || 'Import blocked' })
      return
    }

    await Swal.fire({
      icon: 'success',
      title: data?.message || 'Imported successfully',
      timer: 1500,
      showConfirmButton: false,
    })

    emit('done', { importDate: props.selectedDate || null, summary: data?.summary || [] })
    close()
  } catch (e) {
    const msg = e?.response?.data?.message || e.message || 'Import failed'
    await Swal.fire({ icon: 'error', title: 'Import failed', text: msg })
  } finally {
    loading.value = false
  }
}
</script>