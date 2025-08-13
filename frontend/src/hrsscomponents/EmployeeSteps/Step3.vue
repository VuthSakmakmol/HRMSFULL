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

      <!-- Shift -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.shift"
          :items="enumOptions.shiftOptions"
          label="Shift"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(3)"
          @keydown.enter.prevent="focusNext(3)"
          clearable
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
          :ref="setRef(4)"
          @keydown.enter.prevent="focusNext(4)"
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
          :ref="setRef(5)"
          @keydown.enter.prevent="focusNext(5)"
          clearable
        />
      </v-col>

      <!-- Resign Date (only show if status === Resign) -->
      <v-col cols="12" sm="2" v-if="form.status === 'Resign'">
        <v-text-field
          v-model="form.resignDate"
          label="Resign Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(6)"
          @keydown.enter.prevent="focusNext(6)"
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
          :ref="setRef(7)"
          @update:modelValue="onSourceChange"
          @keydown.enter.prevent="focusNext(7)"
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
          :ref="setRef(8)"
          @keydown.enter.prevent="focusNext(8)"
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
          :ref="setRef(9)"
          @input="normalizeNonNegative('singleNeedle')"
          @keydown.enter.prevent="focusNext(9)"
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
          :ref="setRef(10)"
          @input="normalizeNonNegative('overlock')"
          @keydown.enter.prevent="focusNext(10)"
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
          :ref="setRef(11)"
          @input="normalizeNonNegative('coverstitch')"
          @keydown.enter.prevent="focusNext(11)"
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
          :ref="setRef(12)"
          @input="normalizeNonNegative('totalMachine')"
          @keydown.enter.prevent="focusNext(12)"
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

const enumOptions = ref({
  shiftOptions: [],
  statusOptions: [],
  sourceOfHiringOptions: [],
  resignReasonOptions: []
})

/* Load enums safely */
onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = {
      shiftOptions: data?.shiftOptions || [],
      statusOptions: data?.statusOptions || [],
      sourceOfHiringOptions: data?.sourceOfHiringOptions || [],
      resignReasonOptions: data?.resignReasonOptions || []
    }
  } catch (err) {
    console.error('❌ Failed to load enums in Step 3:', err)
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
  // If selecting “Other”, keep the value; the text field will allow overwrite
  if (typeof val === 'string' && val.toLowerCase() !== 'other') return
}

/* Numeric helpers (keep non-negative integers) */
const normalizeNonNegative = (key) => {
  let v = form[key]
  if (v === '' || v === null || v === undefined) { form[key] = null; return }
  v = String(v).replace(/[^\d]/g, '')
  form[key] = v === '' ? null : Math.max(0, parseInt(v, 10))
}

/* Enter-to-next focus handling (ordered by setRef) */
const inputRefs = []
const setRef = (i) => (el) => { inputRefs[i] = el }
const focusNext = (idx) => {
  const next = inputRefs[idx + 1]
  if (next?.focus) next.focus()
}
</script>
