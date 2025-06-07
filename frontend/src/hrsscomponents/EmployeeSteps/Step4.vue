<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 4: Document Info</h3>
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.idCard" label="ID Card" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.idCardExpireDate" label="ID Expiry Date" type="date" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.nssf" label="NSSF" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.passport" label="Passport" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.passportExpireDate" label="Passport Expiry" type="date" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.visaExpireDate" label="Visa Expiry" type="date" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.medicalCheck" label="Medical Check" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.medicalCheckDate" label="Medical Check Date" type="date" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.workingBook" label="Working Book" dense outlined />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
defineProps({ form: Object })
</script>