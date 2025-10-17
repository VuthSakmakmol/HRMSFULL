<!-- src/components/hrss/shift/ShiftAssignmentForm.vue -->
<template>
  <v-card class="elevation-0">
    <v-card-title class="text-h6">Assign Shift (Single)</v-card-title>

    <v-card-text>
      <v-form ref="formRef" v-model="isValid">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.employeeId"
              label="Employee ID"
              variant="outlined"
              density="comfortable"
              :disabled="busy || loading"
              :rules="[v => !!v || 'Employee ID is required']"
              placeholder="e.g. 51220526"
              clearable
              @change="emitResolve"
            />
          </v-col>

          <v-col cols="12" md="8">
            <v-select
              v-model="form.templateId"
              :items="templates"
              item-title="name"
              item-value="_id"
              label="Shift template"
              variant="outlined"
              density="comfortable"
              :disabled="busy || loading"
              :rules="[v => !!v || 'Template is required']"
              return-object="false"
              clearable
              @update:model-value="emitResolve"
            >
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <v-list-item-title>{{ item.raw?.name || item.title }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatTemplateSubtitle(item.raw) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.start"
              label="Start date"
              type="date"
              variant="outlined"
              density="comfortable"
              :disabled="busy || loading"
              :rules="[v => !!v || 'Start date is required']"
              @change="emitResolve"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.end"
              label="End date"
              type="date"
              variant="outlined"
              density="comfortable"
              :disabled="busy || loading"
              :rules="[v => endValid(v) || 'End date must be ≥ start date']"
              @change="emitResolve"
            />
          </v-col>

          <v-col cols="12" md="4">
            <div class="mini-title mb-1">Weekdays</div>
            <v-btn-toggle
              v-model="form.weekdays"
              multiple
              rounded="lg"
              class="flex-wrap"
              color="primary"
              :disabled="busy || loading"
              @update:model-value="emitResolve"
            >
              <v-btn v-for="d in WEEKDAYS" :key="d.value" :value="d.value" size="small" variant="tonal" class="ma-1">
                {{ d.label }}
              </v-btn>
            </v-btn-toggle>
            <div class="text-caption mt-1 opacity-70">
              Apply on selected weekdays between start–end.
            </div>
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="form.note"
              label="Note (optional)"
              variant="outlined"
              density="comfortable"
              rows="2"
              :disabled="busy || loading"
              @change="emitResolve"
            />
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-spacer />
      <v-btn
        variant="flat"
        class="mr-2"
        :disabled="busy || loading"
        @click="resetForm"
      >
        Reset
      </v-btn>
      <v-btn
        color="primary"
        :loading="busy"
        :disabled="!canSubmit || loading"
        @click="submit"
      >
        Assign
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import api from '@/utils/axios'
import { useShiftApi } from '@/composables/hrss/useShiftApi'

/* ───────── props / emits ───────── */
const props = defineProps({
  templates: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['created', 'resolve'])

/* ───────── constants ───────── */
const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' }
]

/* ───────── state ───────── */
const formRef = ref(null)
const isValid = ref(false)
const busy = ref(false)

const form = ref({
  employeeId: '',
  templateId: '',
  start: dayjs().format('YYYY-MM-DD'),
  end: dayjs().add(6, 'day').format('YYYY-MM-DD'),
  weekdays: [1, 2, 3, 4, 5], // default Mon–Fri
  note: ''
})

/* ───────── composable (optional) ───────── */
let createAssignmentFn = null
try {
  const { createAssignment } = useShiftApi()
  if (typeof createAssignment === 'function') createAssignmentFn = createAssignment
} catch {
  // composable not available in this context; we'll use axios fallback
}

/* ───────── helpers ───────── */
const canSubmit = computed(() =>
  !!form.value.employeeId &&
  !!form.value.templateId &&
  !!form.value.start &&
  endValid(form.value.end) &&
  Array.isArray(form.value.weekdays) &&
  form.value.weekdays.length > 0
)

function endValid(v) {
  if (!v) return false
  return dayjs(v).isSameOrAfter(dayjs(form.value.start), 'day')
}

function emitResolve() {
  emit('resolve', {
    employeeId: form.value.employeeId,
    templateId: form.value.templateId,
    start: form.value.start,
    end: form.value.end,
    weekdays: [...form.value.weekdays],
    note: form.value.note
  })
}

function formatTemplateSubtitle(t) {
  if (!t) return ''
  const abbr = []
  if (t?.start) abbr.push(`Start: ${t.start}`)
  if (t?.end) abbr.push(`End: ${t.end}`)
  if (t?.breaks?.length) abbr.push(`${t.breaks.length} break(s)`)
  if (t?.overtimeRules?.length) abbr.push(`${t.overtimeRules.length} OT rule(s)`)
  return abbr.join(' • ')
}

function resetForm() {
  form.value = {
    employeeId: '',
    templateId: '',
    start: dayjs().format('YYYY-MM-DD'),
    end: dayjs().add(6, 'day').format('YYYY-MM-DD'),
    weekdays: [1, 2, 3, 4, 5],
    note: ''
  }
  isValid.value = false
  emitResolve()
}

/* ───────── submit ───────── */
async function submit() {
  const ok = await formRef.value?.validate()
  if (!ok) return

  const payload = {
    employeeId: form.value.employeeId.trim(),
    templateId: form.value.templateId,
    startDate: form.value.start,
    endDate: form.value.end,
    weekdays: form.value.weekdays, // numbers: 0..6 (Sun..Sat)
    note: form.value.note?.trim() || undefined
  }

  busy.value = true
  try {
    if (createAssignmentFn) {
      await createAssignmentFn(payload)
    } else {
      // Fallback endpoint—adjust to your backend route if different
      await api.post('/hrss/shift-assignments', payload)
    }

    await Swal.fire({
      icon: 'success',
      title: 'Shift assigned',
      text: 'The shift assignment was created successfully.',
      timer: 1200,
      showConfirmButton: false
    })

    emit('created')
    resetForm()
  } catch (err) {
    console.error('[ShiftAssignmentForm] submit failed', err)
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to create shift assignment.'
    Swal.fire({ icon: 'error', title: 'Error', text: msg })
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.mini-title { font-weight: 600; font-size: 0.9rem; }
.opacity-70 { opacity: 0.7; }
</style>
