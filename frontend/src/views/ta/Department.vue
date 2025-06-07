<template>
  <v-container fluid>
    <h2 class="text-h6 font-weight-bold mb-4">📋 Department List</h2>

    <v-card class="rounded-lg pa-4">
      <!-- Search + Buttons -->
      <v-row class="mb-4" align-center justify="space-between">
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            v-model="search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            clearable
            density="compact"
            style="max-width: 250px"
          />
        </v-col>
        <v-col cols="auto" class="d-flex" style="gap: 12px">
          <v-btn color="primary" variant="outlined" @click="showFilterForm = !showFilterForm">
            <v-icon start>mdi-filter</v-icon>
            {{ showFilterForm ? 'Close Filter' : 'Filter Departments' }}
          </v-btn>
          <v-btn color="info" variant="outlined" @click="resetFilters">
            Reset Filters
          </v-btn>
          <v-btn color="success" variant="outlined" @click="exportToExcel" prepend-icon="mdi-file-excel">
            Export Excel
          </v-btn>
        </v-col>
      </v-row>

      <!-- Filter Form -->
      <v-row v-if="showFilterForm" class="mb-4" dense>
        <v-col cols="12" md="2">
          <v-text-field v-model="columnFilters.name" label="Department" variant="outlined" clearable density="compact" hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="columnFilters.type" label="Type" variant="outlined" clearable density="compact" hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="columnFilters.subType" label="Sub-Type" variant="outlined" clearable density="compact" hide-details />
        </v-col>
        <!-- <v-col cols="12" md="2">
          <v-text-field v-model="columnFilters.company" label="Company" variant="outlined" clearable density="compact" hide-details />
        </v-col> -->
        <v-col cols="12" md="3">
          <v-text-field v-model="columnFilters.jobTitles" label="Job Title" variant="outlined" clearable density="compact" hide-details />
        </v-col>
      </v-row>

      <!-- Scrollable Table -->
      <div class="scroll-wrapper">
        <v-table height="550px" fixed-header class="elevation-1 rounded-lg">
          <thead class="custom-sticky-header">
            <tr>
              <th>No</th>
              <th>Department</th>
              <th>Type</th>
              <th>Sub-Type</th>
              <!-- <th>Company</th> -->
              <th>Job Titles</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in filteredDepartments" :key="item._id">
              <td>{{ index + 1 }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.type }}</td>
              <td>{{ item.subType }}</td>
              <!-- <td>{{ item.company }}</td> -->
              <td>
                <div v-if="!expanded[item._id]" class="text-truncate">
                  <v-chip
                    v-if="item.jobTitles?.length"
                    color="secondary"
                    size="x-small"
                    class="ma-1"
                    variant="outlined"
                  >
                    {{ item.jobTitles[0] }}
                  </v-chip>
                  <span v-if="item.jobTitles?.length > 1" class="text-grey text-caption">
                    +{{ item.jobTitles.length - 1 }} more
                  </span>
                  <v-chip v-if="!item.jobTitles?.length" size="x-small" variant="outlined" color="grey">None</v-chip>
                </div>
                <div v-else class="d-flex flex-column">
                  <div v-for="title in item.jobTitles || []" :key="title" class="text-body-2 mb-1">
                    {{ title }}
                  </div>
                </div>
              </td>
              <td>
                <v-btn size="x-small" variant="text" color="primary" icon @click="toggleRow(item._id)">
                  <v-icon>{{ expanded[item._id] ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import * as XLSX from 'xlsx'

const departments = ref([])
const search = ref('')
const expanded = ref({})
const role = localStorage.getItem('role')
const selectedCompany = ref(localStorage.getItem('company'))
const showFilterForm = ref(false)

const columnFilters = ref({
  name: '',
  type: '',
  subType: '',
  // company: '',
  jobTitles: '',
})

const fetchDepartments = async () => {
  try {
    const query = role === 'GeneralManager' ? `?company=${selectedCompany.value}` : ''
    const res = await axios.get(`/departments${query}`)
    departments.value = res.data
  } catch (err) {
    console.error('❌ Failed to fetch departments:', err)
  }
}

const toggleRow = (id) => {
  expanded.value[id] = !expanded.value[id]
}

const resetFilters = () => {
  search.value = ''
  columnFilters.value = {
    name: '',
    type: '',
    subType: '',
    // company: '',
    jobTitles: '',
  }
}

const filteredDepartments = computed(() => {
  return departments.value.filter(dept => {
    const matchesGlobal = Object.values(dept).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(search.value.toLowerCase())
    )
    const matchesColumn = Object.entries(columnFilters.value).every(([key, val]) => {
      if (!val) return true
      if (key === 'jobTitles') {
        return (dept.jobTitles || []).some(title =>
          title.toLowerCase().includes(val.toLowerCase())
        )
      }
      return dept[key]?.toLowerCase().includes(val.toLowerCase())
    })
    return matchesGlobal && matchesColumn
  })
})

const exportToExcel = () => {
  const data = filteredDepartments.value.map((dept, index) => ({
    No: index + 1,
    Department: dept.name,
    Type: dept.type,
    SubType: dept.subType,
    Company: dept.company,
    JobTitles: (dept.jobTitles || []).join(', '),
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments')
  XLSX.writeFile(workbook, 'Department_List.xlsx')
}

onMounted(fetchDepartments)
</script>

<style scoped>
.scroll-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  border-radius: 8px;
  background-color: white;
  -webkit-overflow-scrolling: touch;
}

.v-table {
  min-width: 1200px;
  border-collapse: collapse;
  background-color: #fff;
}

.v-table th,
.v-table td {
  padding: 10px 12px;
  font-size: 13px;
  white-space: nowrap;
  vertical-align: middle;
}

thead.custom-sticky-header tr:first-child {
  background-color: #1976d2;
  color: rgb(0, 0, 0);
}

thead.custom-sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #fff;
}

.v-chip {
  font-size: 14px;
}

td > div.d-flex.flex-column {
  padding-top: 6px;
}

.v-table tbody tr:hover {
  background-color: #e3f2fd !important;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.v-table tbody tr {
  border-bottom: 1px solid #eeeeee;
}

.v-table {
  display: block;
  width: max-content;
  min-width: 100%;
}
</style>
