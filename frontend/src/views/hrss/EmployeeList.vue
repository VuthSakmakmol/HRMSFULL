<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">Employee Management</h2>

    <!-- Top Bar -->
    <div class="d-flex align-center justify-space-between mb-4">
      <v-btn color="primary" @click="$router.push('/hrss/addemployee')">Add Employee</v-btn>
      <div class="d-flex gap-2">
        <v-btn color="error" :disabled="!selected.length" @click="deleteSelected">Delete</v-btn>
        <v-btn color="success" :disabled="!selected.length" @click="exportToExcel">Export Excel</v-btn>
      </div>
    </div>

    <!-- Search -->
    <v-text-field
      v-model="search"
      label="Search employees"
      prepend-inner-icon="mdi-magnify"
      outlined
      dense
      class="mb-4"
    />

    <!-- Table -->
    <v-card>
      <div class="table-scroll-wrapper">
        <table class="scrollable-table">
          <thead>
            <tr>
              <th colspan="11" class="text-center sticky-header">Core Identity</th>
              <th colspan="5" class="text-center sticky-header">Detail Identity</th>
              <th colspan="4" class="text-center sticky-header">Place of Birth</th>
              <th colspan="4" class="text-center sticky-header">Place of Living</th>
              <th colspan="9" class="text-center sticky-header">Responsibility</th>
              <th colspan="9" class="text-center sticky-header">Document</th>
              <th colspan="7" class="text-center sticky-header">Skills</th>
              <th class="text-center sticky-header">Actions</th>
            </tr>
            <tr class="sticky-header second-row">
              <th class="col-no">No</th>
              <th class="col-no">
                <v-checkbox v-model="selectAll" @change="toggleSelectAll" hide-details density="compact" />
              </th>
              <th class="text-center">Completion</th>
              <th
                v-for="field in headerFields"
                :key="field.value"
                @click="toggleFreeze(field.value)"
                :style="getFreezeStyle(field.value)"
              >
                {{ field.label }}
                <v-icon v-if="frozenColumns.includes(field.value)">mdi-snowflake</v-icon>
              </th>
              <th>Action</th>
            </tr>
            <!-- Filters -->
            <tr class="sticky-header third-row">
            <th class="col-no"></th>
            <th class="col-no"></th> <!-- ✅ Add this class to match others -->
            <th class="text-center"></th>
            <th
              v-for="field in headerFields"
              :key="field.value"
              :class="getFreezeClass(field.value)"
              :style="getFreezeStyle(field.value)" 
            >
              <v-autocomplete
                class="compact-filter"
                v-model="filters[field.value]"
                :items="getUniqueValues(field.value)"
                variant="outlined"
                density="compact"
                style="height: 20px; margin-top: 10px;"
                hide-details
                clearable
              />
            </th>
            <th></th>
          </tr>
          </thead>
          <tbody>
            <tr v-for="(emp, index) in paginatedEmployees" :key="emp._id">
              <td class="col-no">
                {{ itemsPerPage > 0 ? (page - 1) * itemsPerPage + index + 1 : index + 1 }}
              </td>
              <td class="col-no">
                <v-checkbox v-model="selected" :value="emp._id" hide-details />
              </td>
              <td class="text-center">
                {{ getCompletionRate(emp) }}%
              </td>
              <td
                v-for="field in headerFields"
                :key="field.value"
                :style="getFreezeStyle(field.value)"
              >
                <template v-if="field.value === 'status'">
                  <v-chip :color="statusColor(getNestedValue(emp, field.value))" class="text-white font-weight-medium" size="small">
                    {{ getNestedValue(emp, field.value) }}
                  </v-chip>
                </template>
                <template v-else-if="field.value === 'remark'">
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" density="compact" size="small">
                        <v-icon :color="getNestedValue(emp, field.value) ? 'orange' : ''">mdi-note-text</v-icon>
                      </v-btn>
                    </template>
                    <span>{{ getNestedValue(emp, field.value) || 'No remark' }}</span>
                  </v-tooltip>
                </template>
                <template v-else-if="isDateField(field.value)">
                  {{ formatDate(getNestedValue(emp, field.value)) }}
                </template>
                <template v-else>
                  {{ getNestedValue(emp, field.value) }}
                </template>
              </td>
              <td>
                <v-btn size="x-small" icon @click="editEmployee(emp)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn size="x-small" icon color="error" @click="deleteEmployee(emp._id)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <v-row class="pagination-wrapper d-flex justify-end align-center mt-4 px-4">
        <v-col cols="auto">
          <v-pagination
            v-model="page"
            :length="Math.ceil(filteredEmployees.length / itemsPerPage)"
            total-visible="5"
            density="comfortable"
            rounded
          />
        </v-col>
        <v-col cols="auto">
          <v-select
            v-model="itemsPerPage"
            :items="[10, 20, 50, { title: 'All', value: -1 }]"
            label="Per page"
            hide-details
            density="compact"
            style="min-width: 120px"
          />
        </v-col>
      </v-row>
    </v-card>
  </v-container>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'

const search = ref('')
const selected = ref([])
const selectAll = ref(false)
const page = ref(1)
const itemsPerPage = ref(10)
const employees = ref([])
const totalFieldsPerEmployee = 48



const frozenColumns = ref([]) // array of field values to freeze
const toggleFreeze = (column) => {
  const i = frozenColumns.value.indexOf(column)
  if (i === -1) frozenColumns.value.push(column)
  else frozenColumns.value.splice(i, 1)
}

const getFreezeClass = (field) => {
  return frozenColumns.value.includes(field) ? 'frozen' : ''
}

const getFreezeStyle = (field) => {
  const index = frozenColumns.value.indexOf(field)
  if (index === -1) return {}

  const offset = frozenColumns.value
    .slice(0, index)
    .reduce((total, col) => total + (columnWidths[col] || 150), 0)

  return {
    position: 'sticky',
    left: `${offset}px`,
    backgroundColor: '#e0f7fa',
    zIndex: 15,
    boxShadow: '2px 0 5px -2px rgba(0,0,0,0.15)',
  }
}

// Optional: define static widths per column
const columnWidths = {
  latinName: 150,
  dob: 160,
  age: 100,
  email: 180,
  // etc. You can apply to all fields you expect to freeze.
}


// complete rate
const getCompletionRate = (emp) => {
  const values = Object.values(emp).flatMap(v =>
    typeof v === 'object' && v !== null ? Object.values(v) : [v]
  )
  const filled = values.filter(v => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / totalFieldsPerEmployee) * 100), 100)
}



const headerFields = [
  { label: 'Employee ID', value: 'employeeId' },
  { label: 'Khmer Name', value: 'khmerName' },
  { label: 'Latin Name', value: 'latinName' },
  { label: 'Gender', value: 'gender' },
  { label: 'Date of Birth', value: 'dob' },
  { label: 'Age', value: 'age' },
  { label: 'Email', value: 'email' },
  { label: 'Phone Number', value: 'phoneNumber' },
  { label: 'Agent Phone Number', value: 'agentPhoneNumber' },
  { label: 'Agent Person', value: 'agentPerson' },
  { label: 'Married Status', value: 'marriedStatus' },
  { label: 'Spouse Name', value: 'spouseName' },
  { label: 'Spouse Contact Number', value: 'spouseContactNumber' },
  { label: 'Education', value: 'education' },
  { label: 'Religion', value: 'religion' },
  { label: 'Province', value: 'placeOfBirth.provinceNameKh' },
  { label: 'District', value: 'placeOfBirth.districtNameKh' },
  { label: 'Commune', value: 'placeOfBirth.communeNameKh' },
  { label: 'Village', value: 'placeOfBirth.villageNameKh' },
  { label: 'Province', value: 'placeOfLiving.provinceNameKh' },
  { label: 'District', value: 'placeOfLiving.districtNameKh' },
  { label: 'Commune', value: 'placeOfLiving.communeNameKh' },
  { label: 'Village', value: 'placeOfLiving.villageNameKh' },
  { label: 'Join Date', value: 'joinDate' },
  { label: 'Department', value: 'department' },
  { label: 'Position', value: 'position' },
  { label: 'Line', value: 'line' },
  { label: 'Team', value: 'team' },
  { label: 'Section', value: 'section' },
  { label: 'Shift', value: 'shift' },
  { label: 'Status', value: 'status' },
  { label: 'Remark', value: 'remark' },
  { label: 'ID Card', value: 'idCard' },
  { label: 'ID Expiry', value: 'idCardExpireDate' },
  { label: 'NSSF', value: 'nssf' },
  { label: 'Passport', value: 'passport' },
  { label: 'Passport Expiry', value: 'passportExpireDate' },
  { label: 'Visa Expiry', value: 'visaExpireDate' },
  { label: 'Medical Check', value: 'medicalCheck' },
  { label: 'Medical Check Date', value: 'medicalCheckDate' },
  { label: 'Working Book', value: 'workingBook' },
  { label: 'Source of Hiring', value: 'sourceOfHiring' },
  { label: 'Introducer ID', value: 'introducerId' },
  { label: 'Employee Type', value: 'employeeType' },
  { label: 'Single Needle', value: 'singleNeedle' },
  { label: 'Over Lock', value: 'overlock' },
  { label: 'Over Stitch', value: 'coverstitch' },
  { label: 'Total Machine', value: 'totalMachine' }
]

const filters = ref({})
headerFields.forEach(field => filters.value[field.value] = '')


const getUniqueValues = (key) => {
  return [...new Set(employees.value.map(e => e[key]).filter(Boolean))].sort()
}

const getNestedValue = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
const isDateField = (field) => field.toLowerCase().includes('date')
const formatDate = val => val ? new Date(val).toLocaleDateString() : ''
const statusColor = status => ({
  Working: 'green',
  Resign: 'orange',
  Terminate: 'red',
  Abandon: 'deep-orange',
  'Pass Away': 'grey',
  Retirement: 'indigo'
}[status] || 'blue-grey')

const filteredEmployees = computed(() =>
  employees.value.filter(emp =>
    Object.entries(filters.value).every(([key, val]) => {
      const result = getNestedValue(emp, key)
      return !val || String(result ?? '').toLowerCase().includes(val.toLowerCase())
    }) &&
    JSON.stringify(emp).toLowerCase().includes(search.value.toLowerCase())
  )
)
const paginatedEmployees = computed(() => {
  if (itemsPerPage.value === -1) return filteredEmployees.value
  const start = (page.value - 1) * itemsPerPage.value
  return filteredEmployees.value.slice(start, start + itemsPerPage.value)
})

const toggleSelectAll = () => {
  selected.value = selectAll.value ? employees.value.map(e => e._id) : []
}

const editEmployee = (emp) => {}
const deleteEmployee = async (id) => {}
const deleteSelected = async () => {}
const exportToExcel = () => {}

onMounted(async () => {
  try {
    const res = await axios.get('/api/employees')
    employees.value = res.data
  } catch (err) {
    console.error('Failed to load employees:', err)
  }
})
</script>

<style scoped>

.table-scroll-wrapper {
  max-height: 600px;
  overflow: auto;
}

.scrollable-table {
  min-width: 160px;
  white-space: nowrap;
  border-collapse: separate;
  border-spacing: 0;
}

.scrollable-table th,
.scrollable-table td {
  white-space: nowrap;
  padding: 3px 10px;
  border-bottom: 1px solid #ccc;
  border-right: 1px solid #ccc;
  background-color: white;
}


/* ✅ Apply min-width only to normal cells (not No/checkbox) */
.scrollable-table th:not(.col-no),
.scrollable-table td:not(.col-no) {
  min-width: 160px;
}


th.col-no,
td.col-no {
  width: 32px !important;
  min-width: 41px !important;
  max-width: 32px !important;
  text-align: center;
  padding: 0 2px !important;
  overflow: hidden;
  white-space: nowrap;
}



.sticky-header {
  position: sticky;
  top: 0;
  background-color: #d1e2f4 !important;
  z-index: 10;
}

.second-row { top: 42px; z-index: 9; background: #d1e2f4; }
.third-row  { top: 84px; z-index: 8; background: #f5f7fa; }

.frozen {
  position: sticky;
  background-color: #e0f7fa !important;
  z-index: 15;
  left: 0; /* will be offset automatically */
  box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.15);
}

/* Adjust pagination placement */
.pagination-wrapper {
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 1;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

/* Filters */
.compact-filter {
  --v-input-control-height: 13px;
  font-size: 12px;
}
.compact-filter .v-field__input {
  min-height: 16px !important;
  font-size: 10px !important;
  padding: 0 !important;
}


/* Complete Cell */
.completion-cell {
  font-weight: 500;
  color: white;
  text-align: center;
  padding: 4px;
  border-radius: 4px;
}

/* 20-gradient shades: red → green */
.completion-0 { background-color: #8b0000; }   /* Dark Red */
.completion-5 { background-color: #a20000; }
.completion-10 { background-color: #b30000; }
.completion-15 { background-color: #c92c00; }
.completion-20 { background-color: #d64500; }
.completion-25 { background-color: #e55e00; }
.completion-30 { background-color: #f17800; }
.completion-35 { background-color: #f89a00; }
.completion-40 { background-color: #fcb900; }
.completion-45 { background-color: #ffca1a; }
.completion-50 { background-color: #ffe44c; color: black; }
.completion-55 { background-color: #e5f443; color: black; }
.completion-60 { background-color: #ccf337; color: black; }
.completion-65 { background-color: #b5f02b; color: black; }
.completion-70 { background-color: #9ced20; color: black; }
.completion-75 { background-color: #85ea14; color: black; }
.completion-80 { background-color: #6ee709; color: black; }
.completion-85 { background-color: #58e600; color: black; }
.completion-90 { background-color: #3fcf00; }
.completion-95 { background-color: #2db400; }
.completion-100 { background-color: #1e9e00; }


</style>
