<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 5: Skills</h3>
    <v-row dense>
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
      <v-col cols="12">
        <v-textarea v-model="form.remark" label="Remark" rows="3" auto-grow outlined />
      </v-col>
      <v-col cols="12">
        <v-textarea v-model="form.note" label="Note" rows="3" auto-grow outlined />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
defineProps({ form: Object })
</script>
