<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">Employee Management</h2>

    <!-- Top Bar -->
    <v-row class="mb-4" align-center="center" justify="space-between">
      <v-col cols="auto">
        <v-btn color="primary" @click="goToAddEmployee">
          <v-icon start>mdi-plus</v-icon> Add Employee
        </v-btn>
      </v-col>
      <v-col cols="auto" class="d-flex gap-2">
        <v-btn color="error" :disabled="!selected.length" @click="deleteSelected">
          <v-icon start>mdi-delete</v-icon> Delete
        </v-btn>
        <v-btn color="success" :disabled="!selected.length" @click="exportToExcel">
          <v-icon start>mdi-file-excel</v-icon> Export Excel
        </v-btn>
      </v-col>
      <div class="text-caption mt-1 text-grey">
        ScrollTop: {{ scrollWrapper?.scrollTop || 0 }}
      </div>


    </v-row>

    <!-- Table -->
    <v-card>
      <div class="table-scroll-wrapper" ref="scrollWrapper">
        <table class="scrollable-table">
          <thead>
            <tr>
              <th><v-checkbox v-model="selectAll" @change="toggleSelectAll" hide-details density="compact" /></th>
              <th>No</th>
              <th>Info</th>
              <th>Profile</th>
              <th v-for="n in 5" :key="n">Details Block {{ n }}</th>
              <th class="bg-action">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(emp, index) in paginatedEmployees" :key="emp._id">
              <td>
                <v-checkbox v-model="selected" :value="emp._id" hide-details density="compact" />
              </td>
              <td>{{ getRowNumber(index) }}</td>
              <td>{{ getCompletionRate(emp) }}%</td>
              <td class="img-cell">
                <img :src="emp.profileImage || defaultImage" class="profile-img" />
              </td>
              <td v-for="(block, blockIndex) in chunkedEmployeeInfo(emp)" :key="blockIndex">
                <div v-for="item in block" :key="item.label" class="info-block">
                  <span class="label">{{ item.label }}:</span> {{ item.value }}
                </div>
              </td>
              <td class="bg-action align-top">
                <div class="d-flex flex-column align-center pa-1" style="gap: 6px; height: 100%;">
                  <v-btn icon size="small" color="primary" @click="editEmployee(emp)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon size="small" color="error" @click="deleteEmployee(emp._id)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                  <v-textarea
                    v-model="emp.note"
                    auto-grow
                    variant="outlined"
                    hide-details
                    placeholder="Write note..."
                    style="width: 100%; font-size: 7px; min-height: 40px;"
                    :counter="60"
                    maxlength="60"
                    @change="updateNote(emp)"
                  />
                </div>
              </td>
              
            </tr>
          </tbody>
        </table>
      </div>
    </v-card>

    <!-- Sticky Pagination Footer -->
    <v-sheet elevation="3" class="position-sticky bottom-0 bg-white px-4 py-2" style="z-index: 10;">
      <v-row align-center="center" justify="space-between">
        <v-col cols="auto">
          <v-select
            v-model="itemsPerPage"
            :items="[10, 50, 100]"
            label="Rows per page"
            density="compact"
            hide-details
            style="width: 130px"
          />
        </v-col>
        <v-col cols="auto">
          <v-pagination
            v-model="page"
            :length="Math.ceil(employees.length / itemsPerPage)"
            rounded
            color="primary"
          />
        </v-col>
      </v-row>
    </v-sheet>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

defineOptions({ name: 'EmployeeList' })

const employees = ref([])
const selected = ref([])
const selectAll = ref(false)
const page = ref(parseInt(sessionStorage.getItem('employeePage')) || 1)
const itemsPerPage = ref(10)
const defaultImage = '/default_images/girl_default_pf.jpg'
const hasLoaded = ref(false)
const router = useRouter()
const scrollWrapper = ref(null)

// Navigate to Add Employee
const goToAddEmployee = () => router.push('/hrss/addemployee')

// Save scroll & page before navigating away
onDeactivated(() => {
  const wrapper = scrollWrapper.value
  if (wrapper) {
    sessionStorage.setItem('employeeScrollTop', wrapper.scrollTop)
    sessionStorage.setItem('employeePage', page.value)
    console.log('💾 Saved scrollTop:', wrapper.scrollTop, 'Page:', page.value)
  }
})

// Restore scroll & page on return
onActivated(() => {
  console.log('✅ onActivated (restoring scroll + page)')
  nextTick(() => {
    const wrapper = scrollWrapper.value
    const savedScroll = parseInt(sessionStorage.getItem('employeeScrollTop') || '0')
    const savedPage = parseInt(sessionStorage.getItem('employeePage') || '1')
    if (wrapper) {
      wrapper.scrollTop = savedScroll
      console.log('🔁 Restored scrollTop to:', savedScroll)
    }
    page.value = savedPage
    console.log('🔁 Restored page to:', savedPage)
  })
})

// Table logic
const toggleSelectAll = () => {
  selectAll.value = !selectAll.value
  selected.value = selectAll.value ? employees.value.map(emp => emp._id) : []
}

const paginatedEmployees = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return employees.value.slice(start, start + itemsPerPage.value)
})

watch(itemsPerPage, () => {
  page.value = 1
})

watch(page, () => {
  sessionStorage.setItem('employeePage', page.value)
})

const getCompletionRate = emp => {
  const values = Object.values(emp).flatMap(v =>
    typeof v === 'object' && v !== null ? Object.values(v) : [v]
  )
  const filled = values.filter(v => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / 48) * 100), 100)
}

const getRowNumber = index => (page.value - 1) * itemsPerPage.value + index + 1

const employeeFields = emp => [
  { label: 'Employee ID', value: emp.employeeId },
  { label: 'Khmer Name', value: `${emp.khmerFirstName} ${emp.khmerLastName}` },
  { label: 'English Name', value: `${emp.englishFirstName} ${emp.englishLastName}` },
  { label: 'Gender', value: emp.gender },
  { label: 'Date of Birth', value: formatDate(emp.dob) },
  { label: 'Age', value: emp.age },
  { label: 'Email', value: emp.email },
  { label: 'Phone Number', value: emp.phoneNumber },
  { label: 'Agent Phone Number', value: emp.agentPhoneNumber },
  { label: 'Agent Person', value: emp.agentPerson },
  { label: 'Married Status', value: emp.marriedStatus },
  { label: 'Spouse Name', value: emp.spouseName },
  { label: 'Spouse Contact', value: emp.spouseContactNumber },
  { label: 'Religion', value: emp.religion },
  { label: 'Nationality', value: emp.nationality },
  { label: 'Introducer ID', value: emp.introducerId },
  { label: 'Join Date', value: formatDate(emp.joinDate) },
  { label: 'Department', value: emp.department },
  { label: 'Position', value: emp.position },
  { label: 'Employee Type', value: emp.employeeType },
  { label: 'Line', value: emp.line },
  { label: 'Team', value: emp.team },
  { label: 'Section', value: emp.section },
  { label: 'Shift', value: emp.shift },
  { label: 'Status', value: emp.status },
  { label: 'Source of Hiring', value: emp.sourceOfHiring },
  { label: 'Single Needle', value: emp.singleNeedle },
  { label: 'Overlock', value: emp.overlock },
  { label: 'Coverstitch', value: emp.coverstitch },
  { label: 'Total Machines', value: emp.totalMachine },
  { label: 'Education', value: emp.education },
  { label: 'ID Card', value: emp.idCard },
  { label: 'ID Expire', value: formatDate(emp.idCardExpireDate) },
  { label: 'NSSF', value: emp.nssf },
  { label: 'Passport', value: emp.passport },
  { label: 'Passport Exp', value: formatDate(emp.passportExpireDate) },
  { label: 'Visa Expire Date', value: formatDate(emp.visaExpireDate) },
  { label: 'Medical Check', value: emp.medicalCheck },
  { label: 'Medical Check Date', value: formatDate(emp.medicalCheckDate) },
  { label: 'Working Book', value: emp.workingBook },
  { label: 'PoB - Province', value: emp.placeOfBirth?.provinceNameKh },
  { label: 'PoB - District', value: emp.placeOfBirth?.districtNameKh },
  { label: 'PoB - Commune', value: emp.placeOfBirth?.communeNameKh },
  { label: 'PoB - Village', value: emp.placeOfBirth?.villageNameKh },
  { label: 'PoL - Province', value: emp.placeOfLiving?.provinceNameKh },
  { label: 'PoL - District', value: emp.placeOfLiving?.districtNameKh },
  { label: 'PoL - Commune', value: emp.placeOfLiving?.communeNameKh },
  { label: 'PoL - Village', value: emp.placeOfLiving?.villageNameKh },
  { label: 'Remark', value: emp.remark },
]

const chunkedEmployeeInfo = emp => {
  const info = employeeFields(emp)
  const chunked = []
  for (let i = 0; i < info.length; i += 10) chunked.push(info.slice(i, i + 10))
  while (chunked.length < 5) chunked.push([])
  return chunked
}

const formatDate = val => (val ? dayjs(val).format('YYYY-MM-DD') : '')

const fetchEmployees = async () => {
  const res = await axios.get(`/employees?company=${localStorage.getItem('company')}`)
  employees.value = res.data
}

const deleteEmployee = async id => {
  await axios.delete(`/api/employees/${id}`)
  employees.value = employees.value.filter(e => e._id !== id)
  Swal.fire({ icon: 'success', title: 'Deleted' })
}

const deleteSelected = async () => {
  for (const id of selected.value) await deleteEmployee(id)
  selected.value = []
  selectAll.value = false
}

const exportToExcel = () => console.log('Exporting...')
const editEmployee = emp => console.log('Edit:', emp)
const updateNote = emp => console.log('Update note for', emp)

// Load only once
onMounted(async () => {
  if (!hasLoaded.value) {
    await fetchEmployees()
    hasLoaded.value = true
  }
})
</script>


<style scoped>
.table-scroll-wrapper {
  overflow-x: auto;
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 6px;
  max-height: 70vh;
  overflow-y: auto;
}

.scrollable-table {
  width: max-content;
  border-collapse: collapse;
  font-size: 13px;
}

.scrollable-table th {
  position: sticky;
  top: 0;
  background-color: #f9f9f9;
  z-index: 2;
}

.scrollable-table th,
.scrollable-table td {
  border: 1px solid #ccc;
  padding: 6px 10px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.scrollable-table tbody tr:hover {
  background-color: #dfedfc;
  cursor: pointer;
}

.profile-img {
  width: 100%;
  height: 4cm;
  object-fit: cover;
  display: block;
}

.img-cell {
  width: 4cm;
  height: 4cm;
  padding: 0;
  text-align: center;
}

.bg-action {
  background-color: #e0ddd7;
  width: 140px;
}

.info-block {
  margin-bottom: 4px;
  font-size: 13px;
  text-align: left;
}

.label {
  font-weight: 500;
  margin-right: 4px;
}
</style>
