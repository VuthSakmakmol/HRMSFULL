<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 3: Responsibility</h3>
    <v-row dense>
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
      <v-col cols="12">
        <v-textarea v-model="form.remark" label="Remark" rows="3" auto-grow outlined />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
defineProps({ form: Object })
</script>