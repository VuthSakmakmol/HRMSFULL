<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6">Step 3: Responsibility</h3>

    <v-row dense>
      <!-- Line / Team / Section -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.line"
          label="Line"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="line"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.team"
          label="Team"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="team"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.section"
          label="Section"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="section"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- Shift -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.shift"
          :items="enumOptions.shiftOptions"
          label="Shift"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="shift"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- Status -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.status"
          :items="enumOptions.statusOptions"
          label="Status"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="status"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- Reason of Resign -->
      <v-col cols="12" sm="2" v-if="form.status === 'Resign'">
        <v-select
          v-model="form.resignReason"
          :items="enumOptions.resignReasonOptions"
          label="Reason of Resign"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="reasonResign"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- Resign Date (only show if status === Resign) -->
      <v-col cols="12" sm="2" v-if="form.status === 'Resign'">
        <v-text-field
          v-model="form.resignDate"
          label="Resign Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="resignDate"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- Source of Hiring -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.sourceOfHiring"
          :items="enumOptions.sourceOfHiringOptions"
          label="Source of Hiring"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="source-of-hiring"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <!-- Skills -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.singleNeedle"
          label="Single Needle"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="single-needle"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.overlock"
          label="Over Lock"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="overlock"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.coverstitch"
          label="Cover Stitch"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="coverstitch"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.totalMachine"
          label="Total Machine"
          type="number"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="total-machine"
          @keydown.enter.prevent="focusNext($event)"
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({ form: Object })
const form = props.form

const enumOptions = ref({
  shiftOptions: [],
  statusOptions: [],
  sourceOfHiringOptions: [],
  resignReasonOptions: []
})

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (err) {
    console.error('❌ Failed to load enums in Step 3:', err)
  }
})

// Reset resignReason and resignDate if status is not Resign
watch(
  () => form.status,
  (val) => {
    if (val === 'Resign') {
      if (!form.resignDate) {
        form.resignDate = new Date().toISOString().substring(0, 10)
      }
    } else {
      form.resignReason = ''
      form.resignDate = null
    }
  }
)

function focusNext(event) {
  const formElements = Array.from(
    event.target
      .closest('form, .v-card, .v-container')
      .querySelectorAll('input, textarea, .v-select input, .v-autocomplete input')
  ).filter(el => !el.disabled && el.offsetParent !== null)
  const index = formElements.indexOf(event.target)
  if (index !== -1 && index + 1 < formElements.length) {
    formElements[index + 1].focus()
  }
}
</script>
