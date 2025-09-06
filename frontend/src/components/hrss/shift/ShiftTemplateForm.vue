<!-- src/components/hrss/ShiftTemplateForm.vue -->
<template>
  <v-form @submit.prevent="save">
    <v-row dense>
      <!-- Basic -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="model.name"
          label="Shift name"
          required
          variant="outlined"
          density="compact"
        />
      </v-col>

      <!-- Core times -->
      <v-col cols="6" md="3">
        <TimeField v-model="model.timeIn" label="Time in" placeholder="07:00 AM" />
      </v-col>

      <v-col cols="6" md="3">
        <TimeField v-model="model.lateAfter" label="Late after" placeholder="07:15 AM" />
      </v-col>

      <v-col cols="6" md="3">
        <TimeField v-model="model.timeOut" label="Time out" placeholder="04:00 PM" />
      </v-col>

      <v-col cols="6" md="3" class="d-flex align-center">
        <v-switch v-model="model.active" label="Active" color="primary" hide-details />
      </v-col>

      <!-- Optional window -->
      <v-col cols="6" md="3">
        <TimeField v-model="model.window.earliestIn" label="Earliest in (opt)" placeholder="05:00 AM" />
      </v-col>

      <v-col cols="6" md="3">
        <TimeField v-model="model.window.latestIn" label="Latest in (opt)" placeholder="08:00 AM" />
      </v-col>

      <!-- Cross midnight is a ROOT boolean -->
      <v-col cols="12" md="3" class="d-flex align-center">
        <v-switch v-model="model.crossMidnight" label="Cross midnight" color="primary" hide-details />
      </v-col>

      <!-- Breaks -->
      <v-col cols="12">
        <div class="d-flex align-center mb-1" style="gap:8px">
          <strong>Breaks</strong>
          <v-btn size="small" variant="tonal" color="primary" @click="addBreak">
            <v-icon start>mdi-plus</v-icon>Add
          </v-btn>
        </div>

        <v-table density="comfortable">
          <thead>
            <tr>
              <th>#</th>
              <th>Start</th>
              <th>End</th>
              <th>Paid</th>
              <th style="width:64px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b,i) in model.breaks" :key="i">
              <td>{{ i + 1 }}</td>
              <td class="py-2">
                <TimeField v-model="b.start" placeholder="11:00 AM" />
              </td>
              <td class="py-2">
                <TimeField v-model="b.end" placeholder="11:30 AM" />
              </td>
              <td>
                <v-switch v-model="b.paid" hide-details inset />
              </td>
              <td class="text-right">
                <v-btn icon size="small" color="error" variant="text" @click="removeBreak(i)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>

            <tr v-if="!model.breaks.length">
              <td colspan="5" class="text-medium-emphasis text-center">No breaks</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>

      <!-- OT -->
      <v-col cols="12" md="4">
        <v-select
          v-model="model.ot.mode"
          :items="['DISABLED','ANY_MINUTES','TIERS']"
          label="OT mode"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <v-col cols="12" md="4" v-if="model.ot.mode !== 'DISABLED'">
        <v-text-field
          v-model.number="model.ot.startAfterMin"
          type="number"
          min="0"
          label="OT starts after (min)"
          placeholder="0"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <v-col cols="12" md="4" v-if="model.ot.mode === 'TIERS'">
        <v-text-field
          v-model="tiersCsv"
          label="OT tiers (minutes, CSV)"
          placeholder="120,180,240"
          variant="outlined"
          density="compact"
          @blur="applyTiers"
        />
      </v-col>

      <!-- Actions -->
      <v-col cols="12" class="d-flex justify-end" style="gap:8px">
        <v-btn variant="text" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" type="submit">Save</v-btn>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup>
import { computed, reactive, watch, ref } from 'vue'
import TimeField from '@/components/common/TimeField.vue'
import api from '@/utils/axios'      // <- your axios instance (adjust path if needed)
import Swal from 'sweetalert2'

/* Props / Emits */
const props = defineProps({
  value: { type: Object, default: () => ({}) }  // pass {} for new; existing doc for edit
})
const emit = defineEmits(['saved','cancel'])

/* State */
const deepClone = (v) => JSON.parse(JSON.stringify(v))
const blank = {
  _id: undefined,
  name: '',
  timeIn: '',
  lateAfter: '',
  timeOut: '',
  breaks: [],
  ot: { mode: 'DISABLED', startAfterMin: 0, tiers: [] },
  window: { earliestIn: '', latestIn: '' },   // optional
  crossMidnight: false,
  active: true
}
const model = reactive(deepClone({ ...blank, ...props.value }))
watch(() => props.value, (v) => Object.assign(model, deepClone({ ...blank, ...v })))

/* OT tiers as CSV */
const tiersCsv = computed({
  get: () => (model.ot?.tiers || []).join(','),
  set: (v) => {
    model.ot.tiers = String(v || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => Number(n))
      .filter(Number.isFinite)
  }
})
const applyTiers = () => { tiersCsv.value = tiersCsv.value }

/* Breaks */
const addBreak = () => model.breaks.push({ start:'', end:'', paid:false })
const removeBreak = (i) => model.breaks.splice(i,1)

/* Validation helpers */
const HHMM = /^\d{2}:\d{2}$/
const isHHmm = v => HHMM.test(String(v || ''))
const toDate = (t, addDay=0) => {
  const [h,m] = String(t).split(':').map(Number)
  return new Date(Date.UTC(2000,0,1+addDay,h,m,0,0))
}
const cmp = (a,b) => toDate(a) - toDate(b)

/* Build + validate payload */
function buildPayload(m) {
  const errs = []

  if (!String(m.name || '').trim()) errs.push('Shift name is required.')

  ;['timeIn','lateAfter','timeOut'].forEach(f=>{
    if (!isHHmm(m[f])) errs.push(`${f} must be HH:mm`)
  })

  if (!errs.length && cmp(m.lateAfter, m.timeIn) < 0)
    errs.push('Late after must be ≥ Time in.')

  const win = {
    earliestIn: (m.window?.earliestIn || '').trim(),
    latestIn:   (m.window?.latestIn || '').trim()
  }
  if (win.earliestIn && !isHHmm(win.earliestIn)) errs.push('Earliest in must be HH:mm')
  if (win.latestIn   && !isHHmm(win.latestIn))   errs.push('Latest in must be HH:mm')

  if (!errs.length && win.earliestIn && cmp(m.timeIn, win.earliestIn) < 0)
    errs.push('Time in must be ≥ Earliest in.')
  if (!errs.length && win.latestIn && cmp(win.latestIn, m.timeIn) < 0)
    errs.push('Latest in must be ≥ Time in.')

  if (!errs.length && !m.crossMidnight && cmp(m.timeOut, m.timeIn) < 0)
    errs.push('Time out must be ≥ Time in unless Cross midnight is ON.')

  ;(m.breaks || []).forEach((b, i) => {
    if (!isHHmm(b.start) || !isHHmm(b.end))
      errs.push(`Break #${i+1}: start/end must be HH:mm`)
    else {
      const sameDay = cmp(b.end, b.start) > 0
      if (!sameDay && !m.crossMidnight)
        errs.push(`Break #${i+1}: end must be after start (or enable Cross midnight).`)
    }
  })

  if (errs.length) throw new Error(errs[0])

  const payload = {
    name: m.name.trim(),
    timeIn: m.timeIn,
    lateAfter: m.lateAfter,
    timeOut: m.timeOut,
    crossMidnight: !!m.crossMidnight,
    active: !!m.active,
    breaks: (m.breaks || []).map(b => ({ start: b.start, end: b.end, paid: !!b.paid })),
    ot: {
      mode: m.ot?.mode || 'DISABLED',
      startAfterMin: Number(m.ot?.startAfterMin || 0),
      tiers: Array.isArray(m.ot?.tiers) ? m.ot.tiers : []
    }
  }
  if (win.earliestIn || win.latestIn) payload.window = win
  return payload
}

/* Save (POST for new, PUT for edit) */
const saving = ref(false)
const save = async () => {
  try {
    const payload = buildPayload(model)
    saving.value = true

    if (model._id) {
      // EDIT
      await api.put(`/hrss/shift-templates/${model._id}`, payload)
    } else {
      // CREATE
      const { data } = await api.post(`/hrss/shift-templates`, payload)
      model._id = data?._id // update local state so further edits use PUT
    }

    await Swal.fire({ icon:'success', title:'Saved' })
    emit('saved')
  } catch (err) {
    const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Save failed'
    Swal.fire({ icon:'error', title:'Save failed', text: msg })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
:deep(.v-field__input) { font-variant-numeric: tabular-nums; }
</style>
