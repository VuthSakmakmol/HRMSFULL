<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 1: Core Identity</h3>
    <v-row dense>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.employeeId"
          @update:modelValue="val => updateField('employeeId', val)"
          label="Employee ID *"
          dense density="compact" variant="outlined" autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.khmerFirstName"
          @update:modelValue="val => updateField('khmerFirstName', val)"
          label="Khmer First Name *"
          dense density="compact" variant="outlined" autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.khmerLastName"
          @update:modelValue="val => updateField('khmerLastName', val)"
          label="Khmer Last Name *"
          dense density="compact" variant="outlined" autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.englishFirstName"
          @update:modelValue="val => updateField('englishFirstName', val)"
          label="English First Name *"
          dense density="compact" variant="outlined" autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.englishLastName"
          @update:modelValue="val => updateField('englishLastName', val)"
          label="English Last Name *"
          dense density="compact" variant="outlined" autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          :model-value="form.gender"
          @update:modelValue="val => updateField('gender', val)"
          :items="enumOptions.genderOptions"
          label="Gender *"
          dense density="compact" variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.dob"
          @update:modelValue="val => updateField('dob', val)"
          label="Date of Birth *"
          type="date"
          dense density="compact" variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.age"
          @update:modelValue="val => updateField('age', val)"
          label="Age"
          type="number"
          dense density="compact" variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.email"
          @update:modelValue="val => updateField('email', val)"
          label="Email"
          dense density="compact" variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.phoneNumber"
          @update:modelValue="val => updateField('phoneNumber', val)"
          label="Phone Number"
          dense density="compact" variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.agentPhoneNumber"
          @update:modelValue="val => updateField('agentPhoneNumber', val)"
          label="Agent Phone Number"
          dense density="compact" variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          :model-value="form.agentPerson"
          @update:modelValue="val => updateField('agentPerson', val)"
          label="Agent Person"
          dense density="compact" variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- ✅ Buttons for Edit Mode -->
    <v-row justify="end" class="mt-4" v-if="isEditMode">
      <v-btn variant="outlined" color="grey" @click="emit('cancelEdit')">Cancel</v-btn>
      <v-btn color="primary" class="ml-2" @click="emit('submitEdit')">Update</v-btn>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({
  form: Object,
  isEditMode: Boolean
})
const emit = defineEmits(['update:form', 'submitEdit', 'cancelEdit'])

const enumOptions = ref({ genderOptions: [] })

const updateField = (key, value) => {
  emit('update:form', { ...props.form, [key]: value })
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (err) {
    console.error('❌ Failed to fetch enum options:', err)
  }
})
</script>
