<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6"> Step 4: Document Info</h3>

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
</script>
