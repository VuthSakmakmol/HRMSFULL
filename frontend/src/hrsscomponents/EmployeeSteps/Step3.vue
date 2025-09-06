<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6">Step 3: Responsibility</h3>

    <v-row dense>
      <!-- Line / Team / Section -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.line"
          label="Line"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(0)"
          @keydown.enter.prevent="focusNext(0)"
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.team"
          label="Team"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(1)"
          @keydown.enter.prevent="focusNext(1)"
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.section"
          label="Section"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(2)"
          @keydown.enter.prevent="focusNext(2)"
          clearable
        />
      </v-col>

      <!-- Shift Template (NEW) -->
      <v-col cols="12" sm="4">
        <v-autocomplete
          v-model="form.shiftTemplateId"
          :items="shiftTemplates"
          item-title="name"
          item-value="_id"
          label="Shift template"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          clearable
          :loading="loadingShifts"
          :ref="setRef(3)"
          @keydown.enter.prevent="focusNext(3)"
        >
          <!-- Pretty dropdown rows -->
          <template #item="{ props, item }">
            <v-list-item
              v-bind="props"
              :title="item.raw.name"
              :subtitle="templateSubtitle(item.raw)"
            />
          </template>

          <!-- Selected chip -->
          <template #selection="{ item }">
            <v-chip class="ma-1" size="small" label>{{ item.raw.name }}</v-chip>
          </template>
        </v-autocomplete>
      </v-col>

      <!-- Optional: effective-from date for initial assignment -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.shiftEffectiveFrom"
          label="Shift effective from"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(4)"
          @keydown.enter.prevent="focusNext(4)"
        />
      </v-col>

      <!-- Status -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.status"
          :items="enumOptions.statusOptions"
          label="Status"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(5)"
          @keydown.enter.prevent="focusNext(5)"
          clearable
        />
      </v-col>

      <!-- Reason of Resign -->
      <v-col cols="12" sm="2" v-if="form.status === 'Resign'">
        <v-select
          v-model="form.resignReason"
          :items="enumOptions.resignReasonOptions"
          label="Reason of Resign"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(6)"
          @keydown.enter.prevent="focusNext(6)"
          clearable
        />
      </v-col>

      <!-- Resign Date -->
      <v-col cols="12" sm="2" v-if="form.status === 'Resign'">
        <v-text-field
          v-model="form.resignDate"
          label="Resign Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(7)"
          @keydown.enter.prevent="focusNext(7)"
        />
      </v-col>

      <!-- Source of Hiring -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.sourceOfHiring"
          :items="enumOptions.sourceOfHiringOptions"
          label="Source of Hiring"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(8)"
          @update:modelValue="onSourceChange"
          @keydown.enter.prevent="focusNext(8)"
          clearable
        />
      </v-col>

      <!-- Source of Hiring (Other) -->
      <v-col cols="12" sm="2" v-if="showOtherSource">
        <v-text-field
          v-model.trim="form.sourceOfHiring"
          label="Specify Source"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(9)"
          @keydown.enter.prevent="focusNext(9)"
          clearable
        />
      </v-col>

      <!-- Skills -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model.number="form.singleNeedle"
          label="Single Needle"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          inputmode="numeric"
          pattern="[0-9]*"
          :ref="setRef(10)"
          @input="normalizeNonNegative('singleNeedle')"
          @keydown.enter.prevent="focusNext(10)"
          clearable
          hint="Number of single-needle machines"
          persistent-hint
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model.number="form.overlock"
          label="Overlock"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          inputmode="numeric"
          pattern="[0-9]*"
          :ref="setRef(11)"
          @input="normalizeNonNegative('overlock')"
          @keydown.enter.prevent="focusNext(11)"
          clearable
          hint="Number of overlock machines"
          persistent-hint
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model.number="form.coverstitch"
          label="Coverstitch"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          inputmode="numeric"
          pattern="[0-9]*"
          :ref="setRef(12)"
          @input="normalizeNonNegative('coverstitch')"
          @keydown.enter.prevent="focusNext(12)"
          clearable
          hint="Number of coverstitch machines"
          persistent-hint
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model.number="form.totalMachine"
          label="Total Machine"
          type="number"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          inputmode="numeric"
          pattern="[0-9]*"
          :ref="setRef(13)"
          @input="normalizeNonNegative('totalMachine')"
          @keydown.enter.prevent="focusNext(13)"
          clearable
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({ form: Object })
const form = props.form

/* ───────── enums (keep existing API for status, sources, etc.) ───────── */
const enumOptions = ref({
  statusOptions: [],
  sourceOfHiringOptions: [],
  resignReasonOptions: []
})

/* ───────── shift templates (new) ───────── */
const shiftTemplates = ref([])
const loadingShifts = ref(false)

const templateSubtitle = (t) => {
  if (!t) return ''
  const base = `${t.timeIn} → ${t.timeOut}`
  const late = t.lateAfter ? ` • late ${t.lateAfter}` : ''
  const ot   = t.ot?.mode && t.ot.mode !== 'DISABLED' ? ` • OT ${t.ot.mode}` : ''
  return base + late + ot
}

onMounted(async () => {
  // enums (non-shift)
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = {
      statusOptions: data?.statusOptions || [],
      sourceOfHiringOptions: data?.sourceOfHiringOptions || [],
      resignReasonOptions: data?.resignReasonOptions || []
    }
  } catch (err) {
    console.error('❌ Failed to load enums in Step 3:', err)
  }

  // active shift templates
  try {
    loadingShifts.value = true
    const { data } = await axios.get('/hrss/shift-templates', { params: { active: true } })
    shiftTemplates.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('❌ Failed to load shift templates:', err)
    shiftTemplates.value = []
  } finally {
    loadingShifts.value = false
  }
})

/* Status → resign fields defaults/clears */
watch(
  () => form.status,
  (val) => {
    if (val === 'Resign') {
      if (!form.resignDate) {
        form.resignDate = new Date().toISOString().substring(0, 10)
      }
    } else {
      form.resignReason = ''
      form.resignDate = null
    }
  }
)

/* Optional "Other" source input */
const showOtherSource = computed(() =>
  typeof form.sourceOfHiring === 'string' &&
  form.sourceOfHiring.toLowerCase() === 'other'
)
const onSourceChange = (val) => {
  if (typeof val === 'string' && val.toLowerCase() !== 'other') return
}

/* Numeric helpers (keep non-negative integers) */
const normalizeNonNegative = (key) => {
  let v = form[key]
  if (v === '' || v === null || v === undefined) { form[key] = null; return }
  v = String(v).replace(/[^\d]/g, '')
  form[key] = v === '' ? null : Math.max(0, parseInt(v, 10))
}

/* Enter-to-next focus handling */
const inputRefs = []
const setRef = (i) => (el) => { inputRefs[i] = el }
const focusNext = (idx) => {
  const next = inputRefs[idx + 1]
  if (next?.focus) next.focus()
}
</script>
