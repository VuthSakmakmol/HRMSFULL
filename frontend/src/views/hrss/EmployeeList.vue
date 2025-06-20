<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">Employee Management</h2>

    <!-- Top Bar -->
    <v-row class="mb-4" align-center justify="space-between">
      <v-col cols="auto">
        <v-btn color="primary" @click="goToAddEmployee">
          <v-icon start>mdi-plus</v-icon> Add Employee
        </v-btn>
      </v-col>
      
      <v-col cols="12" md="auto">
        <v-row class="flex-wrap" dense>
          <v-col cols="auto">
            <v-btn
              color="blue"
              variant="flat"
              :disabled="selected.length !== 1"
              @click="editSelectedEmployee"
            >
              <v-icon start>mdi-pencil</v-icon> Edit
            </v-btn>
          </v-col>

          <v-col cols="auto">
            <v-btn
              color="error"
              variant="flat"
              :disabled="!selected.length"
              @click="deleteSelected"
            >
              <v-icon start>mdi-delete</v-icon> Delete
            </v-btn>
          </v-col>

          <v-col cols="auto">
            <v-btn
              color="indigo"
              variant="flat"
              @click="triggerImportFile"
            >
              <v-icon start>mdi-file-import"></v-icon> Import
            </v-btn>
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx"
              @change="handleImportExcel"
              style="display: none"
            />
          </v-col>

          <v-col cols="auto">
            <v-btn
              color="success"
              variant="flat"
              :disabled="!selected.length"
              @click="exportToExcel"
            >
              <v-icon start>mdi-file-excel"></v-icon> Export
            </v-btn>
          </v-col>
        </v-row>
      </v-col>

    </v-row>

    

    <!-- Employee Table -->
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
            <tr v-for="(emp, index) in employees" :key="emp._id">
              <td><v-checkbox v-model="selected" :value="emp._id" hide-details density="compact" /></td>
              <td>{{ getRowNumber(index) }}</td>
              <td>{{ getCompletionRate(emp) }}%</td>
              <td class="img-cell">
                <img :src="getImageUrl(emp.profileImage)" class="profile-img" />
              </td>
              <td v-for="(block, blockIndex) in chunkedEmployeeInfo(emp)" :key="blockIndex">
                <div v-for="item in block" :key="item.label" class="info-block">
                  <span class="label">{{ item.label }}:</span> {{ item.value }}
                </div>
              </td>
              <td class="bg-action align-top">
                <div class="d-flex flex-column align-center pa-1" style="gap: 6px; height: 100%;">                
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

    <!-- Pagination Footer -->
    <v-sheet elevation="3" class="position-sticky bottom-0 bg-white px-4 py-2" style="z-index: 10;">
      <v-row align-center justify="space-between">
        <v-col cols="auto">
          <v-select
            v-model="itemsPerPage"
            :items="['10', '30', '60', '100', '300', 'all']"
            label="Rows per page"
            density="compact"
            hide-details
            style="width: 130px"
          />
        </v-col>
        <v-col cols="auto">
          <v-pagination
            v-if="itemsPerPage !== 'all'"
            v-model="page"
            :length="totalEmployees > 0 ? Math.ceil(totalEmployees / parseInt(itemsPerPage)) : 1"
            rounded
            color="primary"
          />
        </v-col>
      </v-row>
    </v-sheet>
  </v-container>
</template>


<script setup>
import { ref, watch, onMounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
const formatDate = val => (val ? dayjs(val).format('YYYY-MM-DD') : '')




const getImageUrl = (url) => {
  const backendBase = axios.defaults.baseURL?.replace(/\/api$/, '') || ''
  if (!url || url === '') return defaultImage
  if (url.startsWith('/upload')) return `${backendBase}${url}`
  if (url.startsWith('http')) return url
  return defaultImage
}

const goToAddEmployee = () => {
  router.push('/hrss/addemployee')
}


defineOptions({ name: 'EmployeeList' })

const showForm = ref(false)
const isEditMode = ref(false)
const form = ref({})


// ============= Pagination ==============
const page = ref(parseInt(sessionStorage.getItem('employeePage')) || 1)
const itemsPerPage = ref('10')
const totalEmployees = ref(0)
const getRowNumber = index => {
  const perPage = itemsPerPage.value === 'all' ? totalEmployees.value : parseInt(itemsPerPage.value)
  return (page.value - 1) * perPage + index + 1
}

watch([page, itemsPerPage], () => {
  sessionStorage.setItem('employeePage', page.value)
  fetchEmployees()
})
watch(itemsPerPage, () => page.value = 1)
// ============= End Pagination ==============

// ============= Fetch Employees =============
const employees = ref([])
const hasLoaded = ref(false)
const fetchEmployees = async () => {
  const params = {
    company: localStorage.getItem('company'),
  }

  if (itemsPerPage.value !== 'all') {
    params.page = page.value
    params.limit = itemsPerPage.value
  }

  const res = await axios.get('/employees', { params })

  console.log('✅ Response:', res.data)

  employees.value = res.data.employees
  totalEmployees.value = res.data.total || res.data.employees?.length || 0
}


// ============= End Fetch Employees =============

const router = useRouter()
const selected = ref([])
const selectAll = ref(false)
const scrollWrapper = ref(null)
const defaultImage = '/default_images/girl_default_pf.jpg'

// Save scroll position before leave
onDeactivated(() => {
  const wrapper = scrollWrapper.value
  if (wrapper) {
    sessionStorage.setItem('employeeScrollTop', wrapper.scrollTop)
    sessionStorage.setItem('employeePage', page.value)
  }
})

// Restore scroll on return
onActivated(() => {
  nextTick(() => {
    const wrapper = scrollWrapper.value
    const savedScroll = parseInt(sessionStorage.getItem('employeeScrollTop') || '0')
    const savedPage = parseInt(sessionStorage.getItem('employeePage') || '1')
    if (wrapper) wrapper.scrollTop = savedScroll
    page.value = savedPage
  })
})

// const goToAddEmployee = () => router.push('/hrss/addemployee')
const toggleSelectAll = () => {
  const currentPageIds = employees.value.map(emp => emp._id)
  if (selectAll.value) {
    selected.value = [...new Set([...selected.value, ...currentPageIds])]
  } else {
    selected.value = selected.value.filter(id => !currentPageIds.includes(id))
  }
}

watch([selected, employees], () => {
  const currentPageIds = employees.value.map(emp => emp._id)
  selectAll.value = currentPageIds.every(id => selected.value.includes(id))
})

const deleteSelected = async () => {
  if (!selected.value.length) {
    return Swal.fire({ icon: 'warning', title: 'No employees selected' })
  }

  const confirm = await Swal.fire({
    icon: 'warning',
    title: `Delete ${selected.value.length} employees?`,
    text: "This action cannot be undone.",
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#e53935'
  })

  if (confirm.isConfirmed) {
    try {
      await Promise.all(selected.value.map(id => axios.delete(`/employees/${id}`)))
      employees.value = employees.value.filter(e => !selected.value.includes(e._id))
      selected.value = []
      selectAll.value = false
      Swal.fire({ icon: 'success', title: 'Deleted successfully' })
      fetchEmployees()
    } catch (err) {
      console.error('❌ Deletion failed:', err)
      Swal.fire({ icon: 'error', title: 'Failed to delete', text: err.message })
    }
  }
}


const editSelectedEmployee = () => {
  if (selected.value.length !== 1) {
    return Swal.fire({ icon: 'warning', title: 'Please select exactly 1 employee to edit.' })
  }

  const employeeIdToEdit = selected.value[0]
  router.push({
    path: '/hrss/addemployee',
    query: { id: employeeIdToEdit }
  })
}


const exportToExcel = () => {
  if (!selected.value.length) {
    return Swal.fire({ icon: 'warning', title: 'Please select at least one employee to export.' })
  }

  const exportData = employees.value
    .filter(emp => selected.value.includes(emp._id))
    .map(emp => ({
      'Employee ID': emp.employeeId,
      'Khmer Name': `${emp.khmerFirstName} ${emp.khmerLastName}`,
      'English Name': `${emp.englishFirstName} ${emp.englishLastName}`,
      'Gender': emp.gender,
      'Date of Birth': formatDate(emp.dob),
      'Age': emp.age,
      'Email': emp.email,
      'Phone Number': emp.phoneNumber,
      'Agent Phone': emp.agentPhoneNumber,
      'Agent Person': emp.agentPerson,
      'Married Status': emp.marriedStatus,
      'Spouse Name': emp.spouseName,
      'Spouse Contact': emp.spouseContactNumber,
      'Education': emp.education,
      'Religion': emp.religion,
      'Nationality': emp.nationality,
      'Introducer ID': emp.introducerId,
      'Join Date': formatDate(emp.joinDate),
      'Department': emp.department,
      'Position': emp.position,
      'Line': emp.line,
      'Team': emp.team,
      'Section': emp.section,
      'Shift': emp.shift,
      'Status': emp.status,
      'Source of Hiring': emp.sourceOfHiring,
      'Single Needle': emp.singleNeedle,
      'Overlock': emp.overlock,
      'Coverstitch': emp.coverstitch,
      'Total Machines': emp.totalMachine,
      'Education Level': emp.education,
      'ID Card': emp.idCard,
      'ID Expire': formatDate(emp.idCardExpireDate),
      'NSSF': emp.nssf,
      'Passport': emp.passport,
      'Passport Expire Date': formatDate(emp.passportExpireDate),
      'Visa Expire Date': formatDate(emp.visaExpireDate),
      'Medical Check': emp.medicalCheck,
      'Medical Check Date': formatDate(emp.medicalCheckDate),
      'Working Book': emp.workingBook,
      'Place of Birth - Province': emp.placeOfBirth?.provinceNameKh || '',
      'Place of Birth - District': emp.placeOfBirth?.districtNameKh || '',
      'Place of Birth - Commune': emp.placeOfBirth?.communeNameKh || '',
      'Place of Birth - Village': emp.placeOfBirth?.villageNameKh || '',
      'Place of Living - Province': emp.placeOfLiving?.provinceNameKh || '',
      'Place of Living - District': emp.placeOfLiving?.districtNameKh || '',
      'Place of Living - Commune': emp.placeOfLiving?.communeNameKh || '',
      'Place of Living - Village': emp.placeOfLiving?.villageNameKh || '',
      'Remark': emp.remark,
      'Created At': formatDate(emp.createdAt),
      'Updated At': formatDate(emp.updatedAt)
    }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees')
  XLSX.writeFile(workbook, 'Employees.xlsx')
}


// import data to employee list
const fileInput = ref(null)

const triggerImportFile = () => {
  fileInput.value?.click()
}

const handleImportExcel = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)

    // Optional: Add company if not in file
    const company = localStorage.getItem('company') || 'DEFAULT'

    const payload = rows.map(row => ({
      ...row,
      company // attach default company if needed
    }))

    await axios.post('/employees/import', payload) // your backend endpoint
    Swal.fire({ icon: 'success', title: '✅ Imported successfully!' })
    fetchEmployees()
  } catch (err) {
    console.error('❌ Import error:', err)
    Swal.fire({ icon: 'error', title: 'Import failed', text: err.message })
  } finally {
    event.target.value = '' // clear file input
  }
}




const updateNote = emp => console.log('Update note for', emp)

const getCompletionRate = emp => {
  const values = Object.values(emp).flatMap(v =>
    typeof v === 'object' && v !== null ? Object.values(v) : [v]
  )
  const filled = values.filter(v => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / 48) * 100), 100)
}

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

const submitForm = async () => {
  // If image file selected but not uploaded yet
  if (form.value.profileImageFile && !form.value.profileImage?.startsWith('/upload')) {
    const formData = new FormData()
    formData.append('image', form.value.profileImageFile)

    try {
      const { data } = await axios.post('/api/upload/hrss/profile-image', formData)
      form.value.profileImage = data.imageUrl
    } catch (err) {
      console.error('❌ Image upload failed:', err)
      return Swal.fire({ icon: 'error', title: 'Image upload failed' })
    }
  }

  // Now send the full form
  await axios.post('/api/employees', form.value)
  Swal.fire({ icon: 'success', title: 'Employee added' })
}


const cancelForm = () => {
  showForm.value = false
  form.value = {}
  isEditMode.value = false
}


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
