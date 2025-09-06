<template>
  <v-card flat>
    <v-alert type="info" variant="tonal" class="mb-4">
      Select a template and a date range. Choose employees by IDs (comma or newline) or by filters.
    </v-alert>

    <v-form @submit.prevent="submit">
      <v-row dense>
        <v-col cols="12" md="4">
          <v-autocomplete
            v-model="shiftTemplateId"
            :items="templates"
            item-title="name"
            item-value="_id"
            label="Shift Template"
            variant="outlined"
            density="compact"
            clearable
            required
          />
        </v-col>

        <v-col cols="12" md="2"><v-text-field v-model="from" label="From" variant="outlined" density="compact" placeholder="YYYY-MM-DD" /></v-col>
        <v-col cols="12" md="2"><v-text-field v-model="to"   label="To"   variant="outlined" density="compact" placeholder="YYYY-MM-DD" /></v-col>

        <v-col cols="12" md="4">
          <v-textarea
            v-model="employeeIdsRaw"
            label="Employee IDs (comma or newline)"
            auto-grow rows="2"
            variant="outlined" density="compact"
            placeholder="E001,E002,E003"
          />
        </v-col>

        <v-col cols="12" md="4"><v-text-field v-model="department" label="Department (optional)" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" md="4"><v-text-field v-model="line"       label="Line (optional)"       variant="outlined" density="compact" /></v-col>

        <v-col cols="12" md="12"><v-text-field v-model="reason" label="Reason (optional)" variant="outlined" density="compact" /></v-col>

        <v-col cols="12" class="d-flex align-center" style="gap:8px">
          <v-switch v-model="strict" label="Prevent overlaps (strict)" color="primary" hide-details />
          <v-switch v-model="dryRun" label="Dry run (no write)" color="secondary" hide-details />
          <v-btn color="primary" :loading="submitting" type="submit" class="ml-auto rounded-xl">
            <v-icon start>mdi-check</v-icon> Apply
          </v-btn>
        </v-col>
      </v-row>
    </v-form>

    <v-alert v-if="error" type="error" class="mt-3">{{ error }}</v-alert>
    <v-alert v-if="resultMsg" type="success" class="mt-3">{{ resultMsg }}</v-alert>

    <v-data-table
      v-if="report.length"
      class="mt-4"
      :headers="headers"
      :items="report"
      density="compact"
      items-per-page="10"
    />
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import dayjs from '@/plugins/dayjs'
import { useShiftApi } from '@/composables/hrss/useShiftApi'
import axios from '@/utils/axios'

const props = defineProps({ templates: { type:Array, default:()=>[] }, loading:Boolean })
const emit = defineEmits(['created'])

const { createAssignment } = useShiftApi()

const shiftTemplateId = ref('')
const from = ref(dayjs().format('YYYY-MM-DD'))
const to   = ref('')
const department = ref('')
const line = ref('')
const employeeIdsRaw = ref('')
const reason = ref('')
const strict = ref(true)
const dryRun = ref(false)

const submitting = ref(false)
const error = ref('')
const resultMsg = ref('')
const report = ref([])

const headers = [
  { title:'Employee ID', value:'employeeId' },
  { title:'Result', value:'result' },
  { title:'Message', value:'message' },
]

const parsedIds = computed(() => {
  if (!employeeIdsRaw.value) return []
  return employeeIdsRaw.value
    .split(/[\s,;\n\r]+/).map(s=>s.trim()).filter(Boolean)
})

const submit = async () => {
  error.value = ''; resultMsg.value = ''; report.value = []
  if (!shiftTemplateId.value || !from.value) {
    error.value = 'Template and From are required.'
    return
  }
  submitting.value = true
  try {
    let ids = [...parsedIds.value]

    // if filters used, fetch employees by org (server should have such endpoint; fallback to client via /employees)
    if (!ids.length && (department.value || line.value)) {
      const res = await axios.get('/employees', { params: {
        department: department.value || undefined,
        line: line.value || undefined
      }})
      ids = (res.data || []).map(e => e.employeeId).filter(Boolean)
    }
    if (!ids.length) {
      error.value = 'No employees to assign.'
      return
    }

    // dry-run or create one by one (can be optimized to a batch endpoint later)
    const rows = []
    for (const eid of ids) {
      if (dryRun.value) {
        rows.push({ employeeId: eid, result:'dry-run', message:`Would assign ${shiftTemplateId.value} from ${from.value}${to.value?` to ${to.value}`:''}` })
        continue
      }
      try {
        await createAssignment({
          employeeId: eid,
          shiftTemplateId: shiftTemplateId.value,
          from: from.value,
          to: to.value || undefined,
          reason: reason.value || undefined,
          strict: strict.value
        })
        rows.push({ employeeId: eid, result:'created', message:'OK' })
      } catch (e) {
        rows.push({ employeeId: eid, result:'error', message: e?.response?.data?.message || e.message })
      }
    }
    report.value = rows
    resultMsg.value = dryRun.value ? `Dry-run complete: ${rows.length} rows.` : `Assignments processed: ${rows.filter(r=>r.result==='created').length}/${rows.length}`
    if (!dryRun.value) emit('created')
  } finally {
    submitting.value = false
  }
}
</script>
