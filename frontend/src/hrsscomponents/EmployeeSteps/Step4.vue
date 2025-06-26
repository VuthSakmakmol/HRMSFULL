<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6">Step 4: Document Info</h3>

    <v-row dense>
      <!-- 🎓 Education -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.education"
          :items="enumOptions.educationOptions"
          label="Education"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="education"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- 📄 ID / NSSF -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.idCard"
          label="ID Card"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="id-card"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.idCardExpireDate"
          label="ID Expiry Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="id-expiry"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.nssf"
          label="NSSF"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="nssf"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- 🛂 Passport / Visa -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.passport"
          label="Passport"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="passport"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.passportExpireDate"
          label="Passport Expiry"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="passport-expiry"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.visaExpireDate"
          label="Visa Expiry"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="visa-expiry"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- 🧪 Medical & Work Book -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.medicalCheck"
          label="Medical Check"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="medical-check"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.medicalCheckDate"
          label="Medical Check Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="medical-check-date"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.workingBook"
          label="Working Book"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="working-book"
          @keydown.enter.prevent="focusNext($event)"
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
  educationOptions: []
})

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value.educationOptions = data.educationOptions || []
  } catch (err) {
    console.error('❌ Failed to load enums in Step 4:', err)
  }
})

// Auto-focus next input on Enter
function focusNext(event) {
  const formElements = Array.from(
    event.target
      .closest('form, .v-card, .v-container')
      .querySelectorAll('input, textarea, .v-select input, .v-autocomplete input')
  ).filter(el => !el.disabled && el.offsetParent !== null)
  const index = formElements.indexOf(event.target)
  if (index !== -1 && index + 1 < formElements.length) {
    formElements[index + 1].focus()
  }
}
</script>
