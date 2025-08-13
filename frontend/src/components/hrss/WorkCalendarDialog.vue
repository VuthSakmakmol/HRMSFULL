<template>
  <v-dialog v-model="model" max-width="720">
    <v-card class="rounded-2xl">
      <v-card-title class="text-h6 font-weight-bold">
        <v-icon start>mdi-calendar-cog</v-icon>
        Customize Calendar
      </v-card-title>

      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="text-subtitle-2">
            Month: {{ displayMonthLabel }}
          </div>
          <div class="d-flex ga-2">
            <v-btn size="small" variant="text" icon @click="prevMonth" :disabled="loading">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="nextMonth" :disabled="loading">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </div>
        </div>

        <v-date-picker
          v-model="selectedDates"
          multiple
          :min="monthStart"
          :max="monthEnd"
          show-adjacent-months
          :events="eventsFn"
          :first-day-of-week="1"
          :landscape="$vuetify.display.smAndUp"
          :loading="loading"
        />

        <div class="mt-4 d-flex flex-wrap ga-3">
          <v-select
            class="flex-grow-1"
            v-model="dayType"
            :items="dayTypeItems"
            label="Day Type"
            variant="outlined"
            density="compact"
          />
          <v-text-field
            v-model="note"
            label="Note (optional)"
            variant="outlined"
            density="compact"
            clearable
          />
        </div>

        <div class="mt-3 d-flex flex-wrap ga-2">
          <v-btn size="small" variant="tonal" color="primary" @click="selectAllSundays" :disabled="loading">
            <v-icon start>mdi-calendar-weekend</v-icon>
            Select Sundays (month)
          </v-btn>
          <v-btn size="small" variant="text" @click="clearSelection" :disabled="loading">
            Clear selection
          </v-btn>
        </div>

        <div class="mt-4 text-caption">
          <strong>Tip:</strong> Pick multiple dates, choose a day type, then Save.
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="selectedDates.length === 0" @click="save">
          <v-icon start>mdi-content-save</v-icon> Save
        </v-btn>
        <v-btn color="error" variant="tonal" :loading="deleting" :disabled="selectedDates.length === 0" @click="removeMarks">
          <v-icon start>mdi-trash-can-outline</v-icon> Remove Marks
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import axios from '@/utils/axios'
import dayjs from '@/plugins/dayjs'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'saved'])

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const loading  = ref(false)
const saving   = ref(false)
const deleting = ref(false)

const focusedMonth = ref(dayjs().startOf('month')) // Asia/Phnom_Penh
const selectedDates = ref([]) // array of 'YYYY-MM-DD'

const monthStart = computed(() => focusedMonth.value.startOf('month').format('YYYY-MM-DD'))
const monthEnd   = computed(() => focusedMonth.value.endOf('month').format('YYYY-MM-DD'))
const displayMonthLabel = computed(() => focusedMonth.value.format('MMMM YYYY'))

const dayType = ref('Holiday')
const note    = ref('')
const dayTypeItems = ['Working', 'Holiday', 'Sunday', 'SpecialWorking']

const markedMap = ref(new Map()) // key: 'YYYY-MM-DD' -> { dayType, note }

watch(model, async (open) => {
  if (open) {
    selectedDates.value = []
    dayType.value = 'Holiday'
    note.value = ''
    await loadMonthMarks()
  }
})

async function loadMonthMarks() {
  loading.value = true
  try {
    const y = focusedMonth.value.year()
    const m = focusedMonth.value.month() + 1 // 1..12
    const res = await axios.get('/work-calendar/month', { params: { year: y, month: m } })
    const map = new Map()
    for (const r of (res.data?.items || [])) {
      const k = dayjs(r.date).format('YYYY-MM-DD')
      map.set(k, { dayType: r.dayType, note: r.note || '' })
    }
    markedMap.value = map
  } catch (e) {
    console.error('loadMonthMarks failed', e)
    markedMap.value = new Map()
  } finally {
    loading.value = false
  }
}

function eventsFn(dateStr) {
  return markedMap.value.has(dateStr) ? ['saved'] : []
}

function prevMonth() { focusedMonth.value = focusedMonth.value.subtract(1, 'month'); loadMonthMarks() }
function nextMonth() { focusedMonth.value = focusedMonth.value.add(1, 'month'); loadMonthMarks() }

function selectAllSundays() {
  const start = focusedMonth.value.startOf('month')
  const end   = focusedMonth.value.endOf('month')
  const picks = []
  for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
    if (d.day() === 0) picks.push(d.format('YYYY-MM-DD')) // Sunday
  }
  selectedDates.value = Array.from(new Set([ ...selectedDates.value, ...picks ]))
}

function clearSelection() { selectedDates.value = [] }

async function save() {
  if (selectedDates.value.length === 0) return
  saving.value = true
  try {
    await axios.post('/work-calendar/bulk-upsert', {
      dates: selectedDates.value,
      dayType: dayType.value,
      note: note.value || ''
    })
    emit('saved')
    await loadMonthMarks()
    selectedDates.value = []
  } catch (e) {
    console.error('save calendar failed', e)
  } finally {
    saving.value = false
  }
}

async function removeMarks() {
  if (selectedDates.value.length === 0) return
  deleting.value = true
  try {
    await axios.post('/work-calendar/bulk-delete', { dates: selectedDates.value })
    emit('saved')
    await loadMonthMarks()
    selectedDates.value = []
  } catch (e) {
    console.error('delete calendar failed', e)
  } finally {
    deleting.value = false
  }
}

function close() { model.value = false }
</script>
