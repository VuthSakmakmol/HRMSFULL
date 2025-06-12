<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">Employee Management</h2>

    <!-- Top Bar -->
    <v-row class="mb-4" align-center="center" justify="space-between">
      <v-col cols="auto">
        <v-btn color="primary" @click="$router.push('/hrss/addemployee')">
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
    </v-row>

    <!-- Scrollable Table -->
    <v-card>
      <div class="table-scroll-wrapper">
        <table class="scrollable-table">
          <thead>
            <tr>
              <th>
                <v-checkbox
                  v-model="selectAll"
                  @change="toggleSelectAll"
                  hide-details
                  density="compact"
                ></v-checkbox>
              </th>
              <th>No</th>
              <th>Info</th>
              <th>Profile</th>
              <th v-for="n in 5" :key="n">Details Block {{ n }}</th>
              <th class="bg-orange">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(emp, index) in paginatedEmployees" :key="emp._id">
              <td>
                <v-checkbox
                  v-model="selected"
                  :value="emp._id"
                  hide-details
                  density="compact"
                ></v-checkbox>
              </td>
              <td>{{ getRowNumber(index) }}</td>
              <td>{{ getCompletionRate(emp) }}%</td>
              <td class="img-cell">
                <img :src="emp.profileImage || defaultImage" class="profile-img" />
              </td>

              <!-- Generate 5 blocks × 6 fields -->
              <td v-for="(block, blockIndex) in chunkedEmployeeInfo(emp)" :key="blockIndex">
                <div v-for="item in block" :key="item.label" class="info-block">
                  <span class="label">{{ item.label }}:</span> {{ item.value }}
                </div>
              </td>

              <!-- Actions -->
              <td class="bg-orange align-top">
                <div class="d-flex flex-column align-center pa-1" style="gap: 6px; height: 80%;">
                  <!-- Buttons -->
                  <div>
                    <v-btn icon size="small" color="primary" @click="editEmployee(emp)">
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon size="small" color="error" @click="deleteEmployee(emp._id)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>

                  <!-- Note (Multiline Textarea) -->
                  <v-textarea
                    v-model="emp.note"
                    auto-grow
                    variant="underlined"
                    hide-details
                    placeholder="Write note..."
                    class="mt-1"
                    style="width: 100%; font-size: 12px; min-height: 60px; max-height: 180px;"
                    @change="updateNote(emp)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const employees = ref([])
const selected = ref([])
const selectAll = ref(false)
const page = ref(1)
const itemsPerPage = ref(10)
const defaultImage = '/default_images/girl_default_pf.jpg'

const toggleSelectAll = () => {
  if (selectAll.value) {
    selected.value = employees.value.map(emp => emp._id)
  } else {
    selected.value = []
  }
}


// Format date
const formatDate = val => (val ? dayjs(val).format('YYYY-MM-DD') : '')

// Get completion %
const getCompletionRate = emp => {
  const values = Object.values(emp).flatMap(v =>
    typeof v === 'object' && v !== null ? Object.values(v) : [v]
  )
  const filled = values.filter(v => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / 48) * 100), 100)
}

const getRowNumber = index => (page.value - 1) * itemsPerPage.value + index + 1

// Paginated
const paginatedEmployees = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return employees.value.slice(start, start + itemsPerPage.value)
})

// Fields to show (can customize order here)
const employeeFields = emp => [
  // 🔖 Identification
  { label: 'Employee ID', value: emp.employeeId },
  // { label: 'Company', value: emp.company },

  // 🧑‍💼 Personal Info
  { label: 'Khmer Name', value: `${emp.khmerFirstName} ${emp.khmerLastName}` },
  { label: 'English Name', value: `${emp.englishFirstName} ${emp.englishLastName}` },
  { label: 'Gender', value: emp.gender },
  { label: 'Date of Birth', value: formatDate(emp.dob) },
  { label: 'Age', value: emp.age },
  { label: 'Email', value: emp.email },
  { label: 'Phone Number', value: emp.phoneNumber },
  { label: 'Agent Phone Number', value: emp.agentPhoneNumber },
  { label: 'Agent Person', value: emp.agentPerson },

  // 👪 Family
  { label: 'Married Status', value: emp.marriedStatus },
  { label: 'Spouse Name', value: emp.spouseName },
  { label: 'Spouse Contact', value: emp.spouseContactNumber },

  // 📚 Education & Religion
  { label: 'Religion', value: emp.religion },
  { label: 'Nationality', value: emp.nationality },

  

  // 🏢 Work Info
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

  // 📥 Source & Skills
  { label: 'Source of Hiring', value: emp.sourceOfHiring },
  { label: 'Single Needle', value: emp.singleNeedle },
  { label: 'Overlock', value: emp.overlock },
  { label: 'Coverstitch', value: emp.coverstitch },
  { label: 'Total Machines', value: emp.totalMachine },


  // 📄 Documents
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

  

  // 📍 Address
  { label: 'Place of Birth - Province', value: emp.placeOfBirth?.provinceNameKh },
  { label: 'Place of Birth - District', value: emp.placeOfBirth?.districtNameKh },
  { label: 'Place of Birth - Commune', value: emp.placeOfBirth?.communeNameKh },
  { label: 'Place of Birth - Village', value: emp.placeOfBirth?.villageNameKh },
  { label: 'Place of Living - Province', value: emp.placeOfLiving?.provinceNameKh },
  { label: 'Place of Living - District', value: emp.placeOfLiving?.districtNameKh },
  { label: 'Place of Living - Commune', value: emp.placeOfLiving?.communeNameKh },
  { label: 'Place of Living - Village', value: emp.placeOfLiving?.villageNameKh },
  { label: 'Remark', value: emp.remark },

];


// Break into 5 columns × 6 rows
const chunkedEmployeeInfo = emp => {
  const info = employeeFields(emp)
  const chunked = []
  for (let i = 0; i < info.length; i += 10) {
    chunked.push(info.slice(i, i + 10))
  }
  while (chunked.length < 5) chunked.push([]) // Ensure 5 blocks
  return chunked
}

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

onMounted(fetchEmployees)
</script>

<style scoped>
.table-scroll-wrapper {
  overflow-x: auto;
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.scrollable-table {
  width: max-content;
  border-collapse: collapse;
  font-size: 13px;
}

.scrollable-table th,
.scrollable-table td {
  border: 1px solid #ccc;
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
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

.bg-orange {
  background-color: #ffe0b2;
}

.info-block {
  margin-bottom: 4px;
  font-size: 13px;
}

.label {
  font-weight: 500; /* medium bold */
  margin-right: 4px;
}

</style>
