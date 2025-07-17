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
        <!-- Month -->
        <v-col cols="12" sm="3">
          <v-text-field
            v-model="yearMonth"
            label="Month"
            type="month"
            dense
            @change="loadRows"
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
        Targets for {{ selectedDept || '—' }}
      </v-card-title>

      <v-data-table
        :headers="tableHeaders"
        :items="rows"
        :loading="isLoading"
        class="elevation-1"
      >
        <template #item.target="{ item }">
          <v-text-field
            v-model.number="item.target"
            type="number"
            dense
            hide-details
          />
        </template>
        <template #no-data>
          Select a department and month to begin.
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

const yearMonth    = ref(dayjs().format('YYYY-MM'))
const departments  = ref([])   // { name, jobTitles: [] }
const selectedDept = ref(null)
const rows         = ref([])   // { position, target }

const isLoading    = ref(false)
const isSaving     = ref(false)

const tableHeaders = [
  { text: 'Position', value: 'position' },
  { text: 'Target',   value: 'target'   }
]

// 1) load department list once
async function loadDepartments() {
  try {
    const company = localStorage.getItem('company') || ''
    const res = await axios.get('/departments', { params:{ company }})
    departments.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('❌ loadDepartments error:', err)
    departments.value = []
  }
}

// 2) populate rows whenever month or department changes
async function loadRows() {
  if (!selectedDept.value) {
    rows.value = []
    return
  }
  isLoading.value = true
  try {
    // find positions for this dept
    const deptObj = departments.value.find(d => d.name === selectedDept.value)
    const positions = deptObj?.jobTitles || []

    // fetch existing targets
    const company = localStorage.getItem('company') || ''
    const res = await axios.get('/hrss/manpower/targets', {
      params: { company, yearMonth: yearMonth.value }
    })
    const targets = Array.isArray(res.data) ? res.data : []
    const map = new Map()
    targets.forEach(t => {
      if (t.department === selectedDept.value) {
        map.set(t.position, t.target)
      }
    })

    // build table rows
    rows.value = positions.map(pos => ({
      position: pos,
      target:   map.get(pos) || 0
    }))
  } catch (err) {
    console.error('❌ loadRows error:', err)
    rows.value = []
  } finally {
    isLoading.value = false
  }
}

// 3) save them all
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
        target:     row.target
      })
    ))
    alert('✅ All targets saved.')
  } catch (err) {
    console.error('❌ saveAll error:', err)
    alert('Failed to save some targets.')
  } finally {
    isSaving.value = false
    // reload to reflect any defaults
    loadRows()
  }
}

// wire up
onMounted(async () => {
  await loadDepartments()
  watch([selectedDept, yearMonth], loadRows, { immediate: true })
})
</script>

<style scoped>
.pa-4 { padding: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
</style>
