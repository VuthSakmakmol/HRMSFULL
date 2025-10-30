<!--src/components/hrss/attendance/AttendanceToolbar.vue-->
<template>
  <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl">
    <v-toolbar-title>Attendance</v-toolbar-title>
    <v-spacer />

    <!-- optional progress hint -->
    <v-chip
      v-if="importProg && (importProg.running || importProg.percent > 0)"
      size="small"
      class="mr-2"
      variant="tonal"
    >
      Importing… {{ importProg.percent ?? 0 }}%
    </v-chip>

    <v-btn class="mr-2" variant="tonal" @click="$emit('refresh')">
      <v-icon start>mdi-refresh</v-icon>Refresh
    </v-btn>

    <v-btn class="mr-2" variant="tonal" @click="$emit('open-calendar')">
      <v-icon start>mdi-calendar</v-icon>Calendar
    </v-btn>

    <!-- IMPORTANT: no file input here -->
    <v-btn color="secondary" @click="$emit('import')">
      <v-icon start>mdi-database-import</v-icon>Import
    </v-btn>
  </v-toolbar>
</template>

<script setup>
defineProps({
  // anything your existing code passes; optional & loose-typed
  importProg: { type: Object, default: null },
})
defineEmits(['refresh','open-calendar','import'])
</script>
