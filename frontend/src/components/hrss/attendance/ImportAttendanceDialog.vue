<template>
  <v-dialog v-model="modelValueRef" max-width="800" scrollable>
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
          <div class="text-caption text-medium-emphasis">
            Required columns:
            <code>employeeId</code>, <code>date</code>,
            <code>startTime</code>, <code>endTime</code>, <code>leaveType</code>
          </div>
        </div>

        <!-- Step 2: toggles -->
        <v-switch
          v-model="allowNonWorking"
          color="primary"
          hide-details
          inset
          label="Allow import on Sunday/Holiday (override)"
          class="mt-2"
        />
        <v-switch
          v-model="allowUnknown"
          color="deep-purple-accent-4"
          hide-details
          inset
          label="Allow Unknown Employees (import as Unknown)"
          class="mt-2"
        />

        <!-- Step 3: Preview -->
        <div v-if="previewRows.length" class="mt-4">
          <v-alert type="info" variant="tonal" class="mb-2">
            Previewing first {{ previewRows.length }} rows
          </v-alert>
          <v-table density="compact">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee ID</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in previewRows" :key="i">
                <td>{{ i + 1 }}</td>
                <td>{{ r.employeeId }}</td>
                <td>{{ r.date }}</td>
                <td>{{ r.startTime }}</td>
                <td>{{ r.endTime }}</td>
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
              <span v-if="validateResult.unknownEmployees">
                ({{ validateResult.unknownEmployees }} unknown employees)
              </span>
              <span v-if="validateResult.nonWorkingDay">
                • {{ validateResult.nonWorkingDay }}
              </span>
            </template>
            <template v-else>
              ⚠️ {{ validateResult.message || 'Validation failed' }}
            </template>
          </v-alert>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Close</v-btn>
        <v-btn
          color="info"
          :loading="loading"
          :disabled="!file"
          @click="onValidate"
        >
          <v-icon start>mdi-check-decagram</v-icon>Validate
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!validateResult?.ok"
          @click="onCommit"
        >
          <v-icon start>mdi-database-import</v-icon>Commit Import
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
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
  set: v => emit('update:modelValue', v),
})

/* ───────── State ───────── */
const loading = ref(false)
const file = ref(null)
const allowNonWorking = ref(false)
const allowUnknown = ref(true)
const validateResult = ref(null)
const previewRows = ref([])

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

/* Parse Excel for preview */
function normalizeExcelTime(str) {
  if (!str) return ''
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

async function parseExcelPreview() {
  if (!file.value) return []
  const f = Array.isArray(file.value) ? file.value[0] : file.value
  const buf = await f.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  return rows.slice(0, 5).map((r) => {
    const k = Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase().trim(), v]))
    return {
      employeeId: k.employeeid ?? k['employee id'] ?? k.id ?? '',
      date: k.date ?? '',
      startTime: normalizeExcelTime(k.starttime ?? k['start time'] ?? k.in ?? k.checkin ?? ''),
      endTime: normalizeExcelTime(k.endtime ?? k['end time'] ?? k.out ?? k.checkout ?? ''),
      leaveType: k.leavetype ?? k['leave type'] ?? '',
    }
  })
}

/* ───────── API Calls ───────── */
async function uploadFileToServer(mode = 'validate') {
  const f = Array.isArray(file.value) ? file.value[0] : file.value
  const form = new FormData()
  form.append('file', f)
  form.append('mode', mode)
  form.append('allowNonWorking', allowNonWorking.value)
  form.append('allowUnknown', allowUnknown.value)

  const { data } = await api.post('/attendance/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/* ───────── Validate ───────── */
async function onValidate() {
  try {
    loading.value = true
    previewRows.value = await parseExcelPreview()
    const data = await uploadFileToServer('validate')
    validateResult.value = data
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
