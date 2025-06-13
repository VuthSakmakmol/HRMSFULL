<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 3: Responsibility</h3>
    <v-row dense>
      <!-- Line / Team / Section -->
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.line" label="Line" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.team" label="Team" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.section" label="Section" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>

      <!-- Shift & Status (from enums) -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.shift"
          :items="enumOptions.shiftOptions"
          label="Shift"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.status"
          :items="enumOptions.statusOptions"
          label="Status"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>

      <!-- Source of Hiring (from enums) -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.sourceOfHiring"
          :items="enumOptions.sourceOfHiringOptions"
          label="Source of Hiring"
          dense
          density="compact"
          variant="outlined"
          autocomplete="off"
        />
      </v-col>

      <!-- Skills -->
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.singleNeedle" label="Single Needle" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.overlock" label="Over Lock" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.coverstitch" label="Cover Stitch" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.totalMachine" type="number" label="Total Machine" dense density="compact" variant="outlined" autocomplete="off" />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

defineProps({ form: Object })

const enumOptions = ref({
  shiftOptions: [],
  statusOptions: [],
  sourceOfHiringOptions: []
})

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (err) {
    console.error('❌ Failed to load enums in Step 3:', err)
  }
})
</script>
