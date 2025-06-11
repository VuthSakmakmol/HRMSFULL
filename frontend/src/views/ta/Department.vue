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
          <!-- ✅ This is the correct button to open Add Department Dialog -->
          <v-btn color="primary" variant="outlined" @click="openCreateDialog">
            <v-icon start>mdi-plus</v-icon>
            Add Department
          </v-btn>

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
                <v-btn size="x-small" variant="text" color="orange" icon @click="openEditDialog(item)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn size="x-small" variant="text" color="red" icon @click="openDeleteDialog(item)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Add New Department Dialog -->
        <v-dialog v-model="createDialog" width="500">
          <v-card class="pa-4">
            <v-card-title class="text-h6 font-weight-bold">Add New Department</v-card-title>

            <v-card-text>
              <!-- Department Name -->
              <v-text-field
                v-model="newDept.name"
                label="Department Name"
                density="compact"
                variant="outlined"
                class="mb-2"
              />

              <!-- Type Dropdown -->
              <v-select
                v-model="newDept.type"
                :items="['White Collar', 'Blue Collar']"
                label="Type"
                density="compact"
                variant="outlined"
                class="mb-2"
                clearable
              />

              <!-- Sub-Type Dropdown only for Blue Collar -->
              <v-select
                v-if="newDept.type === 'Blue Collar'"
                v-model="newDept.subType"
                :items="['Sewer', 'Non-Sewer']"
                label="Sub-Type"
                density="compact"
                variant="outlined"
                class="mb-4"
                clearable
              />

              <!-- Job Titles Input -->
              <v-label class="mb-1">Job Titles</v-label>
              <v-row dense class="mb-2">
                <v-col cols="8">
                  <v-text-field
                    v-model="newJobTitle"
                    label="Add Job Title"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="4">
                  <v-btn
                    block
                    color="primary"
                    variant="outlined"
                    class="mt-1"
                    @click="addNewJobTitle"
                  >
                    <v-icon start>mdi-plus</v-icon>Add
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Job Titles List -->
              <v-row dense class="mt-1">
                <v-col cols="12">
                  <v-chip-group column>
                    <v-chip
                      v-for="(title, idx) in newDept.jobTitles"
                      :key="idx"
                      class="ma-1"
                      closable
                      @click:close="newDept.jobTitles.splice(idx, 1)"
                    >
                      {{ title }}
                    </v-chip>
                  </v-chip-group>
                </v-col>
              </v-row>
            </v-card-text>

            <!-- Actions -->
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="createDialog = false">Cancel</v-btn>
              <v-btn color="primary" @click="submitNewDepartment">Create</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Edit Department Dialog -->
        <v-dialog v-model="editDialog" width="500">
          <v-card class="pa-4">
            <v-card-title class="text-h6 font-weight-bold">Edit Department</v-card-title>

            <v-card-text>
              <!-- Department Name -->
              <v-text-field
                v-model="editedDept.name"
                label="Department Name"
                density="compact"
                variant="outlined"
                class="mb-2"
              />

              <!-- Type Dropdown -->
              <v-select
                v-model="editedDept.type"
                :items="['White Collar', 'Blue Collar']"
                label="Type"
                density="compact"
                variant="outlined"
                class="mb-2"
                clearable
              />

              <!-- Sub-Type Dropdown only if Blue Collar -->
              <v-select
                v-if="editedDept.type === 'Blue Collar'"
                v-model="editedDept.subType"
                :items="['Sewer', 'Non-Sewer']"
                label="Sub-Type"
                density="compact"
                variant="outlined"
                class="mb-4"
                clearable
              />

              <!-- Job Titles -->
              <v-label class="mb-1">Job Titles</v-label>
              <v-row dense class="mb-2">
                <v-col cols="8">
                  <v-text-field
                    v-model="newJobTitle"
                    label="Add Job Title"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="4">
                  <v-btn
                    block
                    color="primary"
                    variant="outlined"
                    class="mt-1"
                    @click="addJobTitle"
                  >
                    <v-icon start>mdi-plus</v-icon>Add
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Job Title Chips -->
              <v-chip-group column>
                <v-chip
                  v-for="(title, idx) in editedDept.jobTitles"
                  :key="idx"
                  class="ma-1"
                  closable
                  @click:close="editedDept.jobTitles.splice(idx, 1)"
                  @dblclick="editJobTitle(idx)"
                >
                  {{ title }}
                </v-chip>
              </v-chip-group>
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn text @click="editDialog = false">Cancel</v-btn>
              <v-btn color="primary" @click="saveDepartmentEdit">Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>


        <!-- Delete dialog -->
        <v-dialog v-model="deleteDialog" width="400">
          <v-card class="pa-4">
            <v-card-title>Delete Department</v-card-title>
            <v-card-text>
              <v-radio-group v-model="deleteOption">
                <v-radio label="Delete entire department" value="entire" />
                <v-radio label="Delete selected job titles only" value="partial" />
              </v-radio-group>

              <v-checkbox
                v-if="deleteOption === 'partial'"
                v-for="(title, idx) in selectedDept.jobTitles"
                :key="idx"
                v-model="selectedTitlesToDelete"
                :label="title"
                :value="title"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="deleteDialog = false">Cancel</v-btn>
              <v-btn color="red" @click="confirmDelete">Delete</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'


const departments = ref([])
const search = ref('')
const expanded = ref({})
const role = localStorage.getItem('role')
const selectedCompany = ref(localStorage.getItem('company'))
const showFilterForm = ref(false)

// create, edit and delete dialog
const editDialog = ref(false)
const deleteDialog = ref(false)
const editedDept = ref({})
const selectedDept = ref({})
const newJobTitle = ref('')
const selectedTitlesToDelete = ref([])
const deleteOption = ref('entire')
const createDialog = ref(false)


const newDept = ref({
  name: '',
  type: '',
  subType: '',
  jobTitles: []
})


function openCreateDialog() {
  newDept.value = {
    name: '',
    type: '',
    subType: '',
    jobTitles: []
  }
  newJobTitle.value = ''
  createDialog.value = true
}

function addNewJobTitle() {
  const title = newJobTitle.value.trim()
  if (title && !newDept.value.jobTitles.includes(title)) {
    newDept.value.jobTitles.push(title)
    newJobTitle.value = ''
  }
}

async function submitNewDepartment() {
  if (!newDept.value.name || !newDept.value.type) {
    Swal.fire('Missing Info', 'Department name and type are required.', 'warning')
    return
  }

  try {
    await axios.post('/departments', {
      ...newDept.value,
      company: selectedCompany.value
    })
    createDialog.value = false

    Swal.fire({
      icon: 'success',
      title: 'Department Created',
      showConfirmButton: false,
      timer: 1500
    })

    fetchDepartments()
  } catch (err) {
    console.error('❌ Failed to create department:', err)
    Swal.fire('Error', 'Failed to create department.', 'error')
  }
}



function openEditDialog(dept) {
  editedDept.value = JSON.parse(JSON.stringify(dept)) // Deep clone
  editDialog.value = true
}

function addJobTitle() {
  const title = newJobTitle.value.trim()
  if (title && !editedDept.value.jobTitles.includes(title)) {
    editedDept.value.jobTitles.push(title)
    newJobTitle.value = ''
  }
}

function editJobTitle(index) {
  const current = editedDept.value.jobTitles[index]
  const updated = prompt('Edit job title:', current)
  if (updated && updated.trim()) {
    editedDept.value.jobTitles[index] = updated.trim()
  }
}

async function saveDepartmentEdit() {
  try {
    await axios.put(`/departments/${editedDept.value._id}`, editedDept.value)
    editDialog.value = false

    Swal.fire({
      icon: 'success',
      title: 'Department Updated',
      showConfirmButton: false,
      timer: 1500
    })

    fetchDepartments()
  } catch (err) {
    console.error('❌ Failed to update department:', err)
    Swal.fire('Error', 'Failed to update department.', 'error')
  }
}


function openDeleteDialog(dept) {
  selectedDept.value = dept
  deleteDialog.value = true
  deleteOption.value = 'entire'
  selectedTitlesToDelete.value = []
}

async function confirmDelete() {
  // ✅ Step 1: Close Vuetify dialog BEFORE showing SweetAlert
  deleteDialog.value = false

  // ✅ Step 2: Wait for dialog animation to finish
  await new Promise(resolve => setTimeout(resolve, 250)) // small delay

  // ✅ Step 3: Show confirmation popup
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: deleteOption.value === 'entire'
      ? 'This will delete the entire department!'
      : 'This will delete the selected job titles only!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e53935',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  })

  if (!result.isConfirmed) return

  try {
    if (deleteOption.value === 'entire') {
      await axios.delete(`/departments/${selectedDept.value._id}`)
    } else {
      await axios.put(`/departments/${selectedDept.value._id}/remove-job-titles`, {
        titlesToRemove: selectedTitlesToDelete.value
      })
    }

    await Swal.fire({
      icon: 'success',
      title: 'Deleted Successfully',
      showConfirmButton: false,
      timer: 1500
    })

    fetchDepartments()
  } catch (err) {
    console.error('❌ Failed to delete:', err)
    Swal.fire('Error', 'Failed to delete department.', 'error')
  }
}




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
