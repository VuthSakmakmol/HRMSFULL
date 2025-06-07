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
        <v-text-field v-model="form.education" label="Education" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.religion" label="Religion" dense outlined />
      </v-col>

      <!-- Place of Birth -->
      <v-col cols="12">
        <h4 class="text-subtitle-2 font-weight-medium mt-4 mb-2">Place of Birth</h4>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfBirth.provinceNameKh" label="Province" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfBirth.districtNameKh" label="District" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfBirth.communeNameKh" label="Commune" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfBirth.villageNameKh" label="Village" dense outlined />
      </v-col>

      <!-- Place of Living -->
      <v-col cols="12">
        <h4 class="text-subtitle-2 font-weight-medium mt-4 mb-2">Place of Living</h4>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfLiving.provinceNameKh" label="Province" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfLiving.districtNameKh" label="District" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfLiving.communeNameKh" label="Commune" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.placeOfLiving.villageNameKh" label="Village" dense outlined />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
defineProps({ form: Object })
</script>