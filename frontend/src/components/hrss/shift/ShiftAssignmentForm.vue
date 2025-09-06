<template>
  <v-card flat>
    <v-form @submit.prevent="submit" ref="formRef">
      <v-row dense>
        <v-col cols="12" md="4">
          <v-text-field v-model="employeeId" label="Employee ID" variant="outlined" density="compact" required />
        </v-col>

        <v-col cols="12" md="4">
          <v-autocomplete
            v-model="shiftTemplateId"
            :items="templates"
            item-title="name"
            item-value="_id"
            label="Shift Template"
            variant="outlined"
            density="compact"
            clearable
            required
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field v-model="from" label="From (YYYY-MM-DD)" variant="outlined" density="compact" placeholder="2025-09-01" />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="to" label="To (optional)" variant="outlined" density="compact" placeholder="2025-12-31" />
        </v-col>

        <v-col cols="12" md="12">
          <v-text-field v-model="reason" label="Reason (optional)" variant="outlined" density="compact" />
        </v-col>

        <v-col cols="12" class="d-flex align-center" style="gap:8px">
          <v-switch v-model="strict" label="Prevent overlaps (strict)" color="primary" hide-details />
          <v-btn color="primary" :loading="loading" type="submit" class="ml-auto rounded-xl">
            <v-icon start>mdi-check</v-icon> Assign
          </v-btn>
          <v-btn variant="tonal" color="secondary" class="rounded-xl" @click="resolve">
            <v-icon start>mdi-magnify</v-icon> Resolve Effective
          </v-btn>
        </v-col>
      </v-row>
    </v-form>

    <v-alert v-if="error" type="error" class="mt-3">{{ error }}</v-alert>
    <v-alert v-if="info" type="info" class="mt-3" variant="tonal">{{ info }}</v-alert>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import dayjs from '@/plugins/dayjs'
import { useShiftApi } from '@/composables/hrss/useShiftApi'

const props = defineProps({
  templates: { type: Array, default: () => [] },
  loading: Boolean
})
const emit = defineEmits(['created', 'resolve'])

const { createAssignment, resolveEffective } = useShiftApi()

const employeeId = ref('')
const shiftTemplateId = ref('')
const from = ref(dayjs().format('YYYY-MM-DD'))
const to = ref('')
const reason = ref('')
const strict = ref(true)

const error = ref('')
const info = ref('')
const formRef = ref(null)

watch([employeeId, shiftTemplateId, from, to], () => { error.value = ''; info.value = '' })

const submit = async () => {
  error.value = ''
  if (!employeeId.value || !shiftTemplateId.value || !from.value) {
    error.value = 'Employee ID, Template, and From are required.'
    return
  }
  try {
    await createAssignment({
      employeeId: employeeId.value.trim(),
      shiftTemplateId: shiftTemplateId.value,
      from: from.value,
      to: to.value || undefined,
      reason: reason.value || undefined,
      strict: strict.value
    })
    info.value = 'Assignment created.'
    emit('created')
    // keep form values for next entry (remove if you prefer reset)
  } catch (e) {
    error.value = e?.response?.data?.message || e.message || 'Failed to create assignment.'
  }
}

const resolve = async () => {
  error.value = ''
  if (!employeeId.value || !from.value) {
    error.value = 'Provide Employee ID and From (date) to resolve.'
    return
  }
  try {
    const r = await resolveEffective({ employeeId: employeeId.value.trim(), date: from.value })
    info.value = r?.template ? `Effective on ${from.value}: ${r.template.name}` : 'No effective template.'
    emit('resolve', r)
  } catch (e) {
    error.value = e?.response?.data?.message || e.message || 'Failed to resolve.'
  }
}
</script>
