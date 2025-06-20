<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6"> Step 2: Family & Identity</h3>

    <v-row dense>
      <!-- Married Status -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.marriedStatus"
          :items="enumOptions.marriedStatusOptions"
          label="Married Status"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="married-status"
        />
      </v-col>

      <!-- Spouse Info -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.spouseName"
          label="Spouse Name"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="spouse-name"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.spouseContactNumber"
          label="Spouse Contact"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="spouse-contact"
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
          autocomplete="off"
          name="nationality"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.religion"
          :items="enumOptions.religionOptions"
          label="Religion"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="religion"
        />
      </v-col>

      <!-- Introducer -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.introducerId"
          label="Introducer ID"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="introducer-id"
        />
      </v-col>

      <!-- Job Info -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.joinDate"
          label="Join Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="join-date"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.department"
          label="Department"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="department"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.position"
          label="Position"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="position"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.employeeType"
          :items="enumOptions.employeeTypeOptions"
          label="Employee Type"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="employee-type"
        />
      </v-col>
    </v-row>
  </v-card>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

defineProps({ form: Object })

const enumOptions = ref({
  marriedStatusOptions: [],
  nationalityOptions: [],
  religionOptions: [],
  employeeTypeOptions: []
})

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (err) {
    console.error('❌ Failed to load enums in Step 2:', err)
  }
})
</script>
