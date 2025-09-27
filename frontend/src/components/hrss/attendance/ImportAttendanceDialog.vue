<template>
  <v-dialog v-model="modelValueRef" max-width="900" scrollable>
    <v-card class="rounded-2xl">
      <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl">
        <v-toolbar-title>Import Attendance</v-toolbar-title>
        <v-spacer />
        <v-btn icon variant="text" @click="close"><v-icon>mdi-close</v-icon></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <!-- Step 1: pick shift -->
        <div class="mb-4">
          <div class="text-subtitle-1 mb-1">1) Choose shift template to import</div>
          <v-text-field
            v-model="q"
            placeholder="Search shift by name…"
            density="compact" variant="outlined" prepend-inner-icon="mdi-magnify"
            class="mb-2" hide-details
          />
          <v-table density="comfortable" class="rounded-lg">
            <thead>
              <tr>
                <th style="width:40px"></th>
                <th>Name</th>
                <th>Time</th>
                <th>Late After</th>
                <th>OT</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in filteredTemplates" :key="t._id"
                @click="selectedShiftId = t._id" style="cursor:pointer"
              >
                <td><v-radio :value="t._id" v-model="selectedShiftId" color="primary" hide-details /></td>
                <td>{{ t.name }}</td>
                <td>{{ t.timeIn }} → {{ t.timeOut }}</td>
                <td>{{ t.lateAfter }}</td>
                <td>
                  <span v-if="t.ot?.mode==='DISABLED'">—</span>
                  <span v-else-if="t.ot?.mode==='ANY_MINUTES'">Any (start {{ t.ot?.startAfterMin||0 }}m)</span>
                  <span v-else>Tiers: {{ (t.ot?.tiers||[]).join(',') }} (start {{ t.ot?.startAfterMin||0 }}m)</span>
                </td>
                <td>
                  <v-chip size="x-small" :color="t.active?'green':'grey'" variant="tonal">
                    {{ t.active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </td>
              </tr>
              <tr v-if="!filteredTemplates.length">
                <td colspan="6" class="text-medium-emphasis text-center py-6">No templates</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Step 2: file -->
        <div class="mb-2">
          <div class="text-subtitle-1 mb-1">2) Select Excel file</div>
          <v-file-input
            v-model="file" label="Choose .xlsx / .xls / .csv" prepend-icon="mdi-file-excel"
            accept=".xlsx,.xls,.csv" density="comfortable" variant="outlined"
            :disabled="loading" clearable
          />
          <div class="text-caption text-medium-emphasis">
            Required columns (case-insensitive):
            <code>employeeId</code>, <code>date</code>, <code>startTime</code>, <code>endTime</code>, <code>leaveType</code>.
            <em>(fullName is optional; fetched by employeeId)</em>
          </div>
          <div class="mt-2">
            <v-btn variant="text" @click="downloadSample" :disabled="!selectedShift">
              <v-icon start>mdi-download</v-icon> Download sample for "{{ selectedShift?.name || '...' }}"
            </v-btn>
          </div>
        </div>

        <v-switch
          v-model="allowNonWorking" color="primary" hide-details inset class="mt-2"
          :disabled="loading" label="Allow import on Sunday/Holiday (override)"
        />

        <!-- Results / Issues -->
        <div v-if="validateResult || clientIssues.length" class="mt-4">
          <v-alert :type="alertType" variant="tonal" class="mb-3">
            <template v-if="clientIssues.length">
              ⚠️ Found {{ clientIssues.length }} file issue(s). Please fix and validate again.
            </template>
            <template v-else-if="validateResult?.ok">
              ✅ Validation OK.
              <span v-if="validateResult?.nonWorkingDay">Note: {{ validateResult.nonWorkingDay }}</span>
            </template>
            <template v-else>
              ⚠️ {{ validateResult?.message || 'Validation issues found' }}
              <span v-if="validateResult?.nonWorkingDay"> ({{ validateResult.nonWorkingDay }})</span>
            </template>
          </v-alert>

          <!-- client issues -->
          <div v-if="clientIssues.length" class="mb-3">
            <v-table density="comfortable">
              <thead><tr><th>#</th><th>Problem</th></tr></thead>
              <tbody>
                <tr v-for="(it,i) in clientIssues" :key="i">
                  <td>{{ i+1 }}</td><td>{{ it }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <!-- missing employees -->
          <div v-if="validateResult?.details?.missingEmployee?.length" class="mb-3">
            <div class="font-medium mb-1">
              Missing employees ({{ validateResult.details.missingEmployee.length }})
            </div>
            <v-table density="comfortable">
              <thead><tr><th>Row</th><th>Employee ID</th><th>Full Name</th><th>Reason</th></tr></thead>
              <tbody>
                <tr v-for="m in validateResult.details.missingEmployee.slice(0,50)"
                    :key="`${m.row}-${m.employeeId}`">
                  <td>{{ m.row }}</td><td>{{ m.employeeId || '-' }}</td>
                  <td>{{ m.fullName || '-' }}</td><td>{{ m.reason }}</td>
                </tr>
              </tbody>
            </v-table>
            <div v-if="validateResult.details.missingEmployee.length>50" class="text-caption">
              … and {{ validateResult.details.missingEmployee.length - 50 }} more
            </div>
          </div>

          <!-- no template -->
          <div v-if="validateResult?.details?.noTemplate?.length" class="mb-3">
            <div class="font-medium mb-1">
              Employees without shift template ({{ validateResult.details.noTemplate.length }})
            </div>
            <v-table density="comfortable">
              <thead><tr><th>Employee ID</th><th>Date</th><th>Reason</th></tr></thead>
              <tbody>
                <tr v-for="n in validateResult.details.noTemplate.slice(0,50)"
                    :key="`${n.employeeId}-${n.date}`">
                  <td>{{ n.employeeId }}</td><td>{{ n.date }}</td><td>{{ n.reason }}</td>
                </tr>
              </tbody>
            </v-table>
            <div v-if="validateResult.details.noTemplate.length>50" class="text-caption">
              … and {{ validateResult.details.noTemplate.length - 50 }} more
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Close</v-btn>
        <v-btn color="info" :loading="loading" :disabled="!canValidate" @click="onValidate">
          <v-icon start>mdi-check-decagram</v-icon>Validate
        </v-btn>
        <v-btn color="primary" :loading="loading" :disabled="!canCommit" @click="onCommit">
          <v-icon start>mdi-database-import</v-icon>Commit Import
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import api from '@/utils/axios'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  selectedDate: { type: String, default: '' }, // YYYY-MM-DD
})
const emit = defineEmits(['update:modelValue','done'])

const modelValueRef = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

/* state */
const loading = ref(false)
const shiftTemplates = ref([])
const q = ref('')
const selectedShiftId = ref('')
const file = ref(null)
const allowNonWorking = ref(false)
const validateResult = ref(null)
const clientIssues = ref([])

/* templates */
async function loadTemplates() {
  try {
    const { data } = await api.get('/hrss/shift-templates', { params: { active: true } })
    shiftTemplates.value = Array.isArray(data) ? data : (data?.data || [])
  } catch { shiftTemplates.value = [] }
}
onMounted(loadTemplates)

/* computed */
const filteredTemplates = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return shiftTemplates.value
  return shiftTemplates.value.filter(t => (t.name||'').toLowerCase().includes(s))
})
const selectedShift = computed(() => filteredTemplates.value.find(t => t._id === selectedShiftId.value) || null)
const canValidate = computed(() => !!selectedShift.value && !!file.value && !loading.value)
const canCommit   = computed(() => !!validateResult.value?.ok && !!selectedShift.value && !!file.value && !loading.value)
const alertType   = computed(() => clientIssues.value.length ? 'warning' : (validateResult.value?.ok ? 'success' : 'warning'))

/* helpers */
function close(){ modelValueRef.value = false; resetForm() }
function resetForm(){
  selectedShiftId.value = ''; file.value = null; allowNonWorking.value = false
  validateResult.value = null; clientIssues.value = []; q.value = ''
}

/* excel parsing */
function sheetRowsToJson(workbook){
  const sheetName = workbook.SheetNames[0]
  const ws = workbook.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return json.map(r=>{
    const k = Object.fromEntries(Object.entries(r).map(([key,val])=>[String(key).trim().toLowerCase(),val]))
    return {
      employeeId: k.employeeid ?? k['employee id'] ?? k.id ?? '',
      fullName:   k.fullname ?? k['full name'] ?? '',        // optional
      date:       k.date ?? '',
      startTime:  k.starttime ?? k['start time'] ?? k.in ?? k.checkin ?? '',
      endTime:    k.endtime ?? k['end time'] ?? k.out ?? k.checkout ?? '',
      leaveType:  k.leavetype ?? k['leave type'] ?? ''
    }
  })
}
async function pickFileRows(){
  if (!file.value) return []
  const f = Array.isArray(file.value) ? file.value[0] : file.value
  const buf = await f.arrayBuffer()
  const wb  = XLSX.read(buf, { type:'array' })
  return sheetRowsToJson(wb).map(r=>{
    if (!r.date && props.selectedDate) r.date = props.selectedDate
    return r
  })
}

/* client precheck: no fullName required */
function precheckRows(rows){
  const issues = []
  if (!rows.length){ issues.push('The file is empty or first sheet has no data.'); return issues }
  const must = ['employeeId','date','startTime','endTime','leaveType']
  const keys = Object.keys(rows[0])
  const missing = must.filter(m=>!keys.includes(m))
  if (missing.length) issues.push(`Missing required column(s): ${missing.join(', ')}`)

  rows.slice(0,50).forEach((r,idx)=>{
    const i = idx+1
    if (!String(r.employeeId||'').trim()) issues.push(`Row ${i}: employeeId is required`)
    if (!String(r.date||'').trim())       issues.push(`Row ${i}: date is required`)
    if (!String(r.leaveType||'').trim() &&
        (!String(r.startTime||'').trim() || !String(r.endTime||'').trim()))
      issues.push(`Row ${i}: either leaveType OR startTime+endTime is required`)
  })
  return issues
}

/* actions */
async function onValidate(){
  try {
    loading.value = true; validateResult.value = null; clientIssues.value = []
    const rows = await pickFileRows()
    const issues = precheckRows(rows)
    if (issues.length){ clientIssues.value = issues; return }

    try {
      const { data } = await api.post('/hrss/attendance/import', {
        mode:'validate', allowNonWorking: allowNonWorking.value, rows
      })
      validateResult.value = data
      await Swal.fire({ icon:'success', title:'Validation OK', timer:1200, showConfirmButton:false })
    } catch (e){
      const resp = e?.response
      if (resp && (resp.status===422 || resp.status===409)){
        validateResult.value = resp.data
        await Swal.fire({ icon:'warning', title:'Validation issues', text: resp.data?.message || 'Please review issues below' })
      } else {
        const msg = resp?.data?.message || e.message || 'Validate failed'
        await Swal.fire({ icon:'error', title:'Validate failed', text: msg })
      }
    }
  } finally { loading.value = false }
}

async function onCommit(){
  try {
    loading.value = true
    const rows = await pickFileRows()
    try {
      const { data } = await api.post('/hrss/attendance/import', {
        mode:'commit', allowNonWorking: allowNonWorking.value, rows
      })
      await Swal.fire({ icon:'success', title: data?.message || 'Imported', timer:1600, showConfirmButton:false })
      emit('done', { importDate: props.selectedDate || null, summary: data?.summary || [] })
      close()
    } catch (e){
      const resp = e?.response
      if (resp && (resp.status===409 || resp.status===422)){
        validateResult.value = resp.data
        await Swal.fire({ icon:'warning', title:'Cannot commit', text: resp.data?.message || 'Please review issues below' })
      } else {
        const msg = resp?.data?.message || e.message || 'Import failed'
        await Swal.fire({ icon:'error', title:'Import failed', text: msg })
      }
    }
  } finally { loading.value = false }
}

/* sample CSV WITHOUT fullName */
function downloadSample(){
  if (!selectedShift.value) return
  const today = new Date().toISOString().slice(0,10)
  const header = ['employeeId','date','startTime','endTime','leaveType']
  const sample = [
    ['E0001', props.selectedDate || today, selectedShift.value.timeIn, selectedShift.value.timeOut, '']
  ]
  const rows = [header, ...sample]
  const csv  = rows.map(r => r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `attendance-sample-${selectedShift.value.name}.csv`; a.click()
  URL.revokeObjectURL(url)
}
</script>
