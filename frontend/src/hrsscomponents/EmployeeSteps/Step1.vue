<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 1: Core Identity</h3>
    <v-row dense>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.employeeId" label="Employee ID *" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.khmerFirstName" label="Khmer First Name *" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.khmerLastName" label="Khmer Last Name *" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.englishFirstName" label="English First Name *" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.englishLastName" label="English Last Name *" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.gender"
          :items="enumOptions.genderOptions"
          label="Gender *"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.dob" label="Date of Birth *" type="date" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model.number="form.age" label="Age" type="number" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.email" label="Email" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.phoneNumber" label="Phone Number" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.agentPhoneNumber" label="Agent Phone Number" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.agentPerson" label="Agent Person" dense density="compact" variant="outlined" autocomplete="off"/>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from '@/utils/axios'

defineProps({ form: Object })

const enumOptions = ref({
  genderOptions: []
})

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (error) {
    console.error('❌ Failed to load enum options:', error)
  }
})
</script>
