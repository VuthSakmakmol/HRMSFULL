<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 4: Document Info</h3>
    <v-row dense>
      <!-- 🎓 Education -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.education"
          :items="enumOptions.educationOptions"
          label="Education"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>

      <!-- 📄 ID / NSSF / Passport -->
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.idCard" label="ID Card" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.idCardExpireDate" label="ID Expiry Date" type="date" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.nssf" label="NSSF" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>

      <!-- 🛂 Passport / Visa -->
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.passport" label="Passport" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.passportExpireDate" label="Passport Expiry" type="date" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.visaExpireDate" label="Visa Expiry" type="date" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>

      <!-- 🧪 Medical & Work Book -->
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.medicalCheck" label="Medical Check" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.medicalCheckDate" label="Medical Check Date" type="date" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.workingBook" label="Working Book" dense density="compact" variant="outlined" autocomplete="off" />
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
