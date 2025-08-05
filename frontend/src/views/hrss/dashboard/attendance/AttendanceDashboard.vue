<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h5 font-weight-bold mb-6">📊 Attendance Dashboard</h2>

    <!-- Sewing Department Summary -->
    <PeriodOfSewingDepartmentAttendanceSummary />

    <!-- You can later add more department summaries here -->
  </v-container>
</template>
<script setup>
import PeriodOfSewingDepartmentAttendanceSummary from './PeriodOfSewingDepartmentAttendanceSummary.vue'

</script>
