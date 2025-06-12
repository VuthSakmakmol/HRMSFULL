<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 2: Detail Identity</h3>
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-select v-model="form.marriedStatus" :items="['Single', 'Married', 'Divorced', 'Widowed']" label="Married Status" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.spouseName" label="Spouse Name" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.spouseContactNumber" label="Spouse Contact Number" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.religion" label="Religion" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.introducerId" label="Introducer ID" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.joinDate" label="Join Date" type="date" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.department" label="Department" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.position" label="Position" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.employeeType" label="Employee Type" dense outlined />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
defineProps({ form: Object })
</script>