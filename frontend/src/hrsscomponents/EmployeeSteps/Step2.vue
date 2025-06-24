<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6">Step 2: Family & Identity</h3>

    <v-row dense>
      <!-- Married Status -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.marriedStatus"
          :items="enumOptions.marriedStatusOptions"
          label="Married Status"
          variant="outlined"
          density="comfortable"
        />
      </v-col>

      <!-- Spouse Info -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.spouseName"
          label="Spouse Name"
          variant="outlined"
          density="comfortable"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.spouseContactNumber"
          label="Spouse Contact"
          variant="outlined"
          density="comfortable"
        />
      </v-col>

      <!-- Nationality & Religion -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.nationality"
          :items="enumOptions.nationalityOptions"
          label="Nationality"
          variant="outlined"
          density="comfortable"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.religion"
          :items="enumOptions.religionOptions"
          label="Religion"
          variant="outlined"
          density="comfortable"
        />
      </v-col>

      <!-- Introducer -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.introducerId"
          label="Introducer ID"
          variant="outlined"
          density="comfortable"
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
        />
      </v-col>

      <!-- Department -->
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="selectedDepartment"
          :items="departments"
          item-title="name"
          item-value="name"
          return-object
          label="Department"
          variant="outlined"
          density="comfortable"
          @update:modelValue="onDepartmentChange"
        />
      </v-col>

      <!-- Position -->
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="form.position"
          :items="jobTitles"
          label="Position"
          variant="outlined"
          density="comfortable"
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
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

const { form } = defineProps({ form: Object })


const enumOptions = ref({
  marriedStatusOptions: [],
  nationalityOptions: [],
  religionOptions: [],
  employeeTypeOptions: []
})

const departments = ref([])
const selectedDepartment = ref(null)
const jobTitles = ref([])

const role = localStorage.getItem('role') || ''
const company = localStorage.getItem('company') || ''

const onDepartmentChange = (deptObj) => {
  if (deptObj) {
    form.department = deptObj.name
    jobTitles.value = deptObj.jobTitles || []
  } else {
    form.department = ''
    jobTitles.value = []
  }
}

onMounted(async () => {
  try {
    const enumsRes = await axios.get('/meta/enums')
    enumOptions.value = enumsRes.data

    const query = role === 'GeneralManager' ? `?company=${company}` : ''
    const res = await axios.get(`/departments${query}`)
    departments.value = res.data
  } catch (err) {
    console.error('❌ Failed to load departments or enums:', err)
  }
})
</script>
