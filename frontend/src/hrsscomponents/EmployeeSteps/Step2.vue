<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6">Step 2: Family &amp; Identity</h3>

    <v-row dense>
      <!-- Married Status -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.marriedStatus"
          :items="enumOptions.marriedStatusOptions"
          label="Married Status"
          variant="outlined"
          density="comfortable"
          :ref="setInputRef(0)"
          @update:modelValue="onMarriedStatusChange"
          @keydown.enter="focusNext(0)"
          clearable
        />
      </v-col>

      <!-- Spouse Info (only when Married) -->
      <template v-if="showSpouseFields">
        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.spouseName"
            label="Spouse Name"
            variant="outlined"
            density="comfortable"
            :ref="setInputRef(1)"
            @keydown.enter="focusNext(1)"
            clearable
          />
        </v-col>
        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.spouseContactNumber"
            label="Spouse Contact"
            variant="outlined"
            density="comfortable"
            :ref="setInputRef(2)"
            @keydown.enter="focusNext(2)"
            @input="digitsOnly('spouseContactNumber')"
            clearable
          />
        </v-col>
      </template>

      <!-- Nationality -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.nationality"
          :items="enumOptions.nationalityOptions"
          label="Nationality"
          variant="outlined"
          density="comfortable"
          :ref="setInputRef(3)"
          @keydown.enter="focusNext(3)"
          clearable
        />
      </v-col>

      <!-- Religion -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.religion"
          :items="enumOptions.religionOptions"
          label="Religion"
          variant="outlined"
          density="comfortable"
          :ref="setInputRef(4)"
          @keydown.enter="focusNext(4)"
          clearable
        />
      </v-col>

      <!-- Introducer -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.introducerId"
          label="Introducer ID"
          variant="outlined"
          density="comfortable"
          :ref="setInputRef(5)"
          @keydown.enter="focusNext(5)"
          clearable
        />
      </v-col>

      <!-- Join Date -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.joinDate"
          label="Join Date"
          type="date"
          variant="outlined"
          density="comfortable"
          :ref="setInputRef(6)"
          @keydown.enter="focusNext(6)"
        />
      </v-col>

      <!-- Department (object), synced to form.department (string) -->
      <v-col cols="12" sm="3">
        <v-autocomplete
          v-model="selectedDepartment"
          :items="departments"
          item-title="name"
          return-object
          label="Department"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setInputRef(7)"
          @update:modelValue="onDepartmentChange"
          @keydown.enter="focusNext(7)"
          clearable
        />
        <div class="text-caption text-medium-emphasis mt-1" v-if="form.department">
          Selected: <strong>{{ form.department }}</strong>
        </div>
      </v-col>

      <!-- Position (strings filtered by department) -->
      <v-col cols="12" sm="3">
        <v-autocomplete
          v-model="form.position"
          :items="jobTitles"
          label="Position"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setInputRef(8)"
          @keydown.enter="focusNext(8)"
          :disabled="!selectedDepartment"
          clearable
        />
      </v-col>

      <!-- Employee Type -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.employeeType"
          :items="enumOptions.employeeTypeOptions"
          label="Employee Type"
          variant="outlined"
          density="comfortable"
          :ref="setInputRef(9)"
          @keydown.enter="focusNext(9)"
          clearable
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from '@/utils/axios'

const { form } = defineProps({ form: Object })

/* ───────────────────────── visibility & resets ───────────────────────── */
const showSpouseFields = computed(
  () => (form.marriedStatus || '').toLowerCase() === 'married'
)
const onMarriedStatusChange = (val) => {
  if ((val || '').toLowerCase() !== 'married') {
    form.spouseName = ''
    form.spouseContactNumber = ''
  }
}

/* ───────────────────────── enums ───────────────────────── */
const enumOptions = ref({
  marriedStatusOptions: [],
  nationalityOptions: [],
  religionOptions: [],
  employeeTypeOptions: []
})

/* ───────────────────────── departments / positions ───────────────────────── */
const departments = ref([])            // [{ name, jobTitles: [...] }, ...]
const selectedDepartment = ref(null)   // object; synced to form.department (string)
const jobTitles = ref([])              // strings filtered by selected dept

const role = localStorage.getItem('role') || ''
const company = localStorage.getItem('company') || ''

const onDepartmentChange = (deptObj) => {
  if (deptObj && typeof deptObj === 'object') {
    selectedDepartment.value = deptObj
    form.department = deptObj.name || ''
    jobTitles.value = Array.isArray(deptObj.jobTitles) ? deptObj.jobTitles : []
    // If current position not in new list, clear it
    if (form.position && !jobTitles.value.includes(form.position)) {
      form.position = ''
    }
  } else {
    selectedDepartment.value = null
    form.department = ''
    jobTitles.value = []
    form.position = ''
  }
}

/* Keep selectedDepartment in sync if form.department is prefilled (editing) */
watch(
  () => form.department,
  (name) => {
    if (!name || !departments.value.length) return
    const found = departments.value.find(d => d?.name === name)
    if (found && selectedDepartment.value?.name !== name) {
      selectedDepartment.value = found
      jobTitles.value = Array.isArray(found.jobTitles) ? found.jobTitles : []
    }
  }
)

/* ───────────────────────── load options ───────────────────────── */
onMounted(async () => {
  try {
    const enumsRes = await axios.get('/meta/enums')
    enumOptions.value = {
      marriedStatusOptions: enumsRes?.data?.marriedStatusOptions || [],
      nationalityOptions: enumsRes?.data?.nationalityOptions || [],
      religionOptions: enumsRes?.data?.religionOptions || [],
      employeeTypeOptions: enumsRes?.data?.employeeTypeOptions || []
    }

    const query = role === 'GeneralManager' && company ? `?company=${encodeURIComponent(company)}` : ''
    const res = await axios.get(`/departments${query}`)
    departments.value = Array.isArray(res.data) ? res.data : []

    // hydrate selectedDepartment from existing form.department (edit mode)
    if (form.department) {
      const found = departments.value.find(d => d?.name === form.department)
      if (found) {
        selectedDepartment.value = found
        jobTitles.value = Array.isArray(found.jobTitles) ? found.jobTitles : []
      }
    }
  } catch (err) {
    console.error('❌ Failed to load departments or enums:', err)
  }
})

/* ───────────────────────── UX helpers ───────────────────────── */
const inputRefs = []
const setInputRef = (i) => (el) => { inputRefs[i] = el }
const focusNext = (index) => {
  const next = inputRefs[index + 1]
  if (next?.focus) next.focus()
}

/* digits-only for contact fields */
const digitsOnly = (key) => {
  let v = form[key] ?? ''
  v = String(v).replace(/[^\d]/g, '')
  if (v && !v.startsWith('0')) v = '0' + v
  form[key] = v.slice(0, 20)
}
</script>
