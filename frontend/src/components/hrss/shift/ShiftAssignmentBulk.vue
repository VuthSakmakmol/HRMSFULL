<!-- src/components/hrss/shift/ShiftAssignmentBulk.vue -->
<template>
  <v-card class="elevation-0">
    <v-card-title class="text-h6">Bulk Assign Shifts</v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col cols="12" md="6">
          <v-select
            label="Shift template"
            :items="templates"
            item-title="name"
            item-value="_id"
            v-model="form.templateId"
            :disabled="loading"
            variant="outlined"
            density="comfortable"
            clearable
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            label="Start date"
            type="date"
            v-model="form.start"
            :disabled="loading"
            variant="outlined"
            density="comfortable"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            label="End date"
            type="date"
            v-model="form.end"
            :disabled="loading"
            variant="outlined"
            density="comfortable"
          />
        </v-col>

        <v-col cols="12">
          <v-textarea
            label="Employee IDs (comma, space, or newline separated)"
            v-model="form.employeeIds"
            :disabled="loading"
            rows="4"
            variant="outlined"
            density="comfortable"
            hint="Example: 51220526, 51221200, 51620103"
            persistent-hint
          />
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-spacer />
      <v-btn
        color="primary"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit"
      >
        Assign
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  templates: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['created'])

const form = ref({
  templateId: '',
  start: '',
  end: '',
  employeeIds: '' // free-text; parse on submit
})

const canSubmit = computed(() =>
  !!form.value.templateId &&
  !!form.value.start &&
  !!form.value.end &&
  form.value.employeeIds.trim().length > 0
)

function parseIds(raw = '') {
  return raw
    .split(/[\s,;\n\r]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

async function submit() {
  // Minimal stub: just emit so parent refreshes the table.
  // Replace with real API call when your bulk endpoint is ready.
  // Example (if you have one):
  // const { bulkAssign } = useShiftApi()
  // await bulkAssign({
  //   templateId: form.value.templateId,
  //   start: form.value.start,
  //   end: form.value.end,
  //   employeeIds: parseIds(form.value.employeeIds),
  // })

  console.debug('[ShiftAssignmentBulk] would assign', {
    templateId: form.value.templateId,
    start: form.value.start,
    end: form.value.end,
    employeeIds: parseIds(form.value.employeeIds),
  })

  emit('created')
}
</script>

<style scoped>
</style>
