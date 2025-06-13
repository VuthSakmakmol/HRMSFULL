<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 2: Family & Identity</h3>
    <v-row dense>
      <!-- Married Status -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.marriedStatus"
          :items="enumOptions.marriedStatusOptions"
          label="Married Status"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>

      <!-- Spouse Info -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.spouseName"
          label="Spouse Name"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.spouseContactNumber"
          label="Spouse Contact Number"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>

      <!-- Nationality & Religion -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.nationality"
          :items="enumOptions.nationalityOptions"
          label="Nationality"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.religion"
          :items="enumOptions.religionOptions"
          label="Religion"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>

      <!-- Introducer -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.introducerId"
          label="Introducer ID"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>

      <!-- Job Info -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.joinDate"
          label="Join Date"
          type="date"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.department"
          label="Department"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.position"
          label="Position"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.employeeType"
          :items="enumOptions.employeeTypeOptions"
          label="Employee Type"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
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
