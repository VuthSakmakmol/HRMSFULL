<template>
  <v-container fluid class="pa-4">
    <v-card class="mb-6 pa-4">
      <v-card-title>
        Set / Update Monthly Targets
        <v-spacer/>
        <v-btn color="primary" @click="saveAll" :loading="isSaving">
          Save All
        </v-btn>
      </v-card-title>

      <v-row dense align="center">
        <!-- Year -->
        <v-col cols="12" sm="3">
          <v-select
            v-model="selectedYear"
            :items="years"
            label="Year"
            dense
            hide-details
          />
        </v-col>

        <!-- Month -->
        <v-col cols="12" sm="3">
          <v-select
            v-model="selectedMonth"
            :items="months"
            item-title="text"
            item-value="value"
            label="Month"
            dense
            hide-details
          />
        </v-col>

        <!-- Department -->
        <v-col cols="12" sm="4">
          <v-autocomplete
            v-model="selectedDept"
            :items="departments"
            item-title="name"
            item-value="name"
            label="Department"
            dense
            hide-details
          />
        </v-col>
      </v-row>
    </v-card>

    <v-card>
      <v-card-title>
        Targets for {{ selectedDept || '—' }} ({{ yearMonth }})
      </v-card-title>

      <v-data-table
        :headers="tableHeaders"
        :items="rows"
        :loading="isLoading"
        class="elevation-1"
      >
        <!-- editable Budget -->
        <template #item.target="{ item }">
          <v-text-field
            v-model.number="item.target"
            type="number"
            dense
            hide-details
          />
        </template>
        <!-- editable Roadmap -->
        <template #item.roadmap="{ item }">
          <v-text-field
            v-model.number="item.roadmap"
            type="number"
            dense
            hide-details
          />
        </template>
        <!-- no-data -->
        <template #no-data>
          Select a year, month and department to begin.
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

// 1) Year/Month dropdown data
const currentYear = dayjs().year()
const years       = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i))
const months      = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1).padStart(2, '0')
  const text  = dayjs().month(i).format('MMMM')
  return { text, value }
})

// 2) Selected filters
const selectedYear  = ref(dayjs().format('YYYY'))
const selectedMonth = ref(dayjs().format('MM'))
const selectedDept  = ref(null)

// 3) Computed YYYY-MM string
const yearMonth = computed(() => `${selectedYear.value}-${selectedMonth.value}`)

// 4) Department lists (raw + deduped)
const departmentsRaw = ref([])
const departments    = computed(() => {
  const seen = new Set()
  return departmentsRaw.value.filter(d => {
    if (seen.has(d.name)) return false
    seen.add(d.name)
    return true
  })
})

// 5) Table data + state
const rows      = ref([])   // { position, target, roadmap }
const isLoading = ref(false)
const isSaving  = ref(false)

// 6) Headers: use `title` so they render correctly
const tableHeaders = [
  { title: 'Position',         value: 'position' },
  { title: 'Target: Budget',   value: 'target'   },
  { title: 'Target: Roadmap',  value: 'roadmap'  },
]

// 7) Load departments once
async function loadDepartments() {
  try {
    const company = localStorage.getItem('company') || ''
    const res     = await axios.get('/departments', { params: { company } })
    departmentsRaw.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('❌ loadDepartments error:', err)
    departmentsRaw.value = []
  }
}

// 8) Load rows when yearMonth or dept changes
async function loadRows() {
  if (!selectedDept.value) {
    rows.value = []
    return
  }
  isLoading.value = true
  try {
    // find jobTitles for that dept
    const deptObj   = departmentsRaw.value.find(d => d.name === selectedDept.value)
    const positions = deptObj?.jobTitles || []

    // fetch existing targets (with roadmap)
    const company = localStorage.getItem('company') || ''
    const res     = await axios.get('/hrss/manpower/targets', {
      params: { company, yearMonth: yearMonth.value }
    })
    const targets = Array.isArray(res.data) ? res.data : []

    // build lookup maps
    const mapT = new Map()
    const mapR = new Map()
    targets.forEach(t => {
      if (t.department === selectedDept.value) {
        mapT.set(t.position, t.target)
        mapR.set(t.position, t.roadmap || 0)
      }
    })

    // assemble rows
    rows.value = positions.map(pos => ({
      position: pos,
      target:   mapT.get(pos) || 0,
      roadmap:  mapR.get(pos) || 0
    }))
  } catch (err) {
    console.error('❌ loadRows error:', err)
    rows.value = []
  } finally {
    isLoading.value = false
  }
}

// 9) Save all
async function saveAll() {
  if (!selectedDept.value) {
    return alert('Select a department first.')
  }
  isSaving.value = true
  try {
    const company = localStorage.getItem('company') || ''
    await Promise.all(rows.value.map(row =>
      axios.post('/hrss/manpower/targets', {
        company,
        department: selectedDept.value,
        position:   row.position,
        yearMonth:  yearMonth.value,
        target:     row.target,
        roadmap:    row.roadmap
      })
    ))
    alert('✅ All targets saved.')
  } catch (err) {
    console.error('❌ saveAll error:', err)
    alert('Failed to save some targets.')
  } finally {
    isSaving.value = false
    loadRows()
  }
}

// 10) Watch & mount
watch([yearMonth, selectedDept], loadRows, { immediate: true })
onMounted(loadDepartments)
</script>

<style scoped>
.pa-4 { padding: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
</style>
