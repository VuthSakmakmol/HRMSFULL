<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 3: Responsibility</h3>
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.line" label="Line" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.team" label="Team" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.section" label="Section" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.shift" :items="['Day Shift', 'Night Shift']" label="Shift" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.status" :items="['Working', 'Resign', 'Terminate', 'Abandon', 'Pass Away', 'Retirement']" label="Status" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.sourceOfHiring" label="Source of Hiring" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.singleNeedle" label="Single Needle" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.overlock" label="Over Lock" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.coverstitch" label="Over Stitch" dense outlined />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.totalMachine" label="Total Machine" type="number" dense outlined />
      </v-col>

      
    </v-row>
  </v-card>
</template>

<script setup>
defineProps({ form: Object })
</script>