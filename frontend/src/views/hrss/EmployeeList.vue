<template>
  <v-container fluid class="pa-4 employee-page">
    <!-- Header / Toolbar -->
    <v-card class="mb-4 rounded-2xl elevation-1">
      <v-toolbar density="comfortable" class="rounded-t-2xl">
        <v-toolbar-title class="font-weight-bold">
          <v-icon class="mr-2" color="primary">mdi-briefcase-account</v-icon>
          {{ $t('employeeManagement') }}
        </v-toolbar-title>
        <v-spacer />

        <!-- Quick stats -->
        <div class="d-none d-sm-flex ga-2 mr-2">
          <v-chip size="small" variant="tonal" color="primary">
            <v-icon start size="16">mdi-account-multiple</v-icon>
            {{ filteredEmployees.length.toLocaleString() }} {{ $t('employees') || 'Employees' }}
          </v-chip>
          <v-chip size="small" variant="tonal" color="indigo">
            <v-icon start size="16">mdi-check-all</v-icon>
            {{ selected.length }} {{ $t('selected') || 'Selected' }}
          </v-chip>
        </div>

        <!-- Global Search -->
        <v-text-field
          v-model="q"
          :label="$t('search') || 'Search employees…'"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          class="mx-2"
          style="max-width: 320px"
          prepend-inner-icon="mdi-magnify"
        />

        <!-- Actions -->
        <v-tooltip text="Add Employee">
          <template #activator="{ props }">
            <v-btn v-bind="props" color="primary" class="ml-1" @click="goToAddEmployee" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Edit Selected (1)">
          <template #activator="{ props }">
            <span>
              <v-btn
                v-bind="props"
                class="ml-1"
                color="blue"
                :disabled="selected.length !== 1"
                @click="editSelectedEmployee"
                icon
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </span>
          </template>
        </v-tooltip>

        <v-tooltip text="Delete Selected">
          <template #activator="{ props }">
            <span>
              <v-btn
                v-bind="props"
                class="ml-1"
                color="error"
                :disabled="!selected.length"
                @click="deleteSelected"
                icon
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </span>
          </template>
        </v-tooltip>

        <v-tooltip text="Import .xlsx">
          <template #activator="{ props }">
            <v-btn v-bind="props" class="ml-1" color="indigo" @click="triggerImportFile" icon>
              <v-icon>mdi-file-import</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx"
          @change="handleImportExcel"
          style="display:none"
        />

        <v-tooltip text="Export Selected">
          <template #activator="{ props }">
            <span>
              <v-btn
                v-bind="props"
                class="ml-1"
                color="success"
                :disabled="!selected.length"
                @click="exportToExcel"
                icon
              >
                <v-icon>mdi-file-excel</v-icon>
              </v-btn>
            </span>
          </template>
        </v-tooltip>

        <v-tooltip text="Generate ID Card (select 1)">
          <template #activator="{ props }">
            <span>
              <v-btn
                v-bind="props"
                class="ml-1"
                color="teal"
                :disabled="selected.length !== 1"
                @click="openCardDialog"
                icon
              >
                <v-icon>mdi-card-account-details</v-icon>
              </v-btn>
            </span>
          </template>
        </v-tooltip>
      </v-toolbar>

      <!-- Sub-toolbar pagination controls -->
      <div class="px-4 py-2 d-flex align-center justify-space-between flex-wrap">
        <div class="d-flex align-center ga-2">
          <v-icon size="18" color="grey">mdi-information-outline</v-icon>
          <span class="text-medium-emphasis">
            {{ $t('hint') || 'Tip' }}: {{ $t('searchToFilter') || 'Use search to filter across all fields' }}
          </span>
        </div>

        <div class="d-flex align-center ga-3">
          <div class="d-flex align-center">
            <span class="me-2">Rows</span>
            <v-select
              v-model="itemsPerPage"
              :items="[10, 50, 100, 1000, 'all']"
              style="width: 110px"
              density="compact"
              variant="outlined"
              hide-details
            />
          </div>
          <v-btn icon :disabled="page === 1" @click="page--" variant="text">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <span class="mx-2 text-high-emphasis">{{ page }} / {{ totalPagesLocal }}</span>
          <v-btn icon :disabled="page === totalPagesLocal" @click="page++" variant="text">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Card Preview Dialog -->
    <v-dialog v-model="showCardDialog" width="880">
      <v-card class="pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="teal">mdi-card-account-details</v-icon>
            <h3 class="text-h6 font-weight-bold">
              Employee ID Card
              <span v-if="selectedEmployee">— {{ selectedEmployee.employeeId }}</span>
            </h3>
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="tonal" @click="downloadPNG">
              <v-icon start>mdi-image</v-icon> PNG
            </v-btn>
            <v-btn color="primary" @click="downloadPDF">
              <v-icon start>mdi-file-pdf-box</v-icon> PDF
            </v-btn>
            <v-btn variant="text" @click="showCardDialog=false">Close</v-btn>
          </div>
        </div>

        <v-divider class="my-3" />

        <!-- Scaled preview for neat fit -->
        <div class="card-preview-wrapper">
          <div id="cardPreviewScale" class="card-preview-scale">
            <EmployeeCard
              v-if="selectedEmployee"
              ref="cardRef"
              :key="selectedEmployee._id"
              :employee="selectedEmployee"
              :companyName="companyName"
              :logoSrc="logoSrc"
              :qrSrc="''"
              :footerText="footerText"
              :backendBase="backendBase"
              :defaultImage="defaultImage"
            />
          </div>
        </div>
      </v-card>
    </v-dialog>

    <!-- Employee Table Card -->
    <v-card class="rounded-2xl elevation-1">
      <!-- Loading -->
      <div v-if="isLoading" class="d-flex justify-center pa-10">
        <DotLottieVue
          style="height: 200px; width: 200px"
          autoplay
          loop
          src="https://lottie.host/b3e4008f-9dbd-4b76-b13e-e1cdb52f6190/3JhAvD9aX1.json"
        />
      </div>

      <!-- Data Table -->
      <div v-else ref="scrollWrapper" class="table-scroll-wrapper">
        <table class="scrollable-table">
          <thead>
            <tr>
              <th class="sticky-col sticky-left">
                <v-checkbox v-model="selectAll" @change="toggleSelectAll" hide-details density="compact" />
              </th>
              <th class="sticky-col sticky-left-2">No</th>
              <th class="sticky-col sticky-left-3">Info</th>
              <th class="sticky-col sticky-left-4">Profile</th>
              <th v-for="n in 5" :key="n">Details Block {{ n }}</th>
              <th class="bg-action">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(emp, index) in paginatedEmployees" :key="emp._id">
              <td class="sticky-col sticky-left">
                <v-checkbox v-model="selected" :value="emp._id" hide-details density="compact" />
              </td>
              <td class="sticky-col sticky-left-2">{{ getRowNumber(index) }}</td>
              <td class="sticky-col sticky-left-3">
                <v-chip size="small" color="primary" variant="tonal">
                  {{ getCompletionRate(emp) }}%
                </v-chip>
              </td>
              <td class="img-cell sticky-col sticky-left-4">
                <img :src="getImageUrl(emp.profileImage)" class="profile-img" />
              </td>

              <!-- Five blocks of 10 fields -->
              <td v-for="(block, blockIndex) in chunkedEmployeeInfo(emp)" :key="blockIndex">
                <div v-for="item in block" :key="item.label" class="info-block">
                  <span class="label">{{ item.label }}:</span>
                  <span class="value">{{ item.value }}</span>
                </div>
              </td>

              <td class="bg-action align-top">
                <div class="d-flex flex-column align-center pa-2" style="gap: 8px">
                  <v-textarea
                    v-model="emp.note"
                    auto-grow
                    variant="outlined"
                    hide-details
                    placeholder="Write note..."
                    style="width: 100%; font-size: 11px; min-height: 48px"
                    :counter="120"
                    maxlength="120"
                    @change="updateNote(emp)"
                    rows="2"
                    density="comfortable"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bottom Pagination (mirrors top) -->
      <v-sheet elevation="0" class="d-flex justify-end align-center px-4 py-3">
        <span class="me-2 text-medium-emphasis">Rows</span>
        <v-select
          v-model="itemsPerPage"
          :items="[10, 50, 100, 1000, 'all']"
          style="width: 110px"
          density="compact"
          variant="outlined"
          hide-details
        />
        <v-btn class="ml-2" icon :disabled="page === 1" @click="page--" variant="text">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <span class="mx-2 text-high-emphasis">{{ page }} / {{ totalPagesLocal }}</span>
        <v-btn icon :disabled="page === totalPagesLocal" @click="page++" variant="text">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </v-sheet>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import EmployeeCard from '@/components/hrss/EmployeeCard.vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

defineOptions({ name: 'EmployeeList' })

const router = useRouter()

/* ------------------------------- Card ------------------------------- */
const showCardDialog = ref(false)
const cardRef = ref(null)
const backendBase = (axios.defaults.baseURL?.replace(/\/api$/, '')) || ''
const companyName = 'Trax Apparel Cambodia'
const logoSrc = '/logos/CAM-TAC.jpg'
const footerText = 'Factory Phone: 023 880 453 • HR: 011 996 498'

/* ------------------------------ State ------------------------------- */
const employees = ref([])
const selected = ref([])
const selectAll = ref(false)
const totalEmployees = ref(0)
const scrollWrapper = ref(null)
const defaultImage = '/default_images/girl_default_pf.jpg'
const hasLoaded = ref(false)
const isLoading = ref(true)
const fileInput = ref(null)

// pagination (client-side on filtered)
const page = ref(1)
const itemsPerPage = ref(10) // number or "all"
const q = ref('')            // global search

/* ---------------------------- Lifecycle ------------------------------ */
onMounted(async () => {
  if (!hasLoaded.value) {
    await fetchEmployees()
    hasLoaded.value = true
  }
})

/* ----------------------------- Helpers ------------------------------- */
const formatDate = (val) => (val ? dayjs(val).format('YYYY-MM-DD') : '')
const getImageUrl = (url) => {
  const base = axios.defaults.baseURL?.replace(/\/api$/, '') || ''
  if (!url || url === '') return defaultImage
  if (url.startsWith('/upload')) return `${base}${url}`
  if (url.startsWith('http')) return url
  return defaultImage
}

/* ----------------------------- Card I/O ------------------------------ */
const captureCard = async () => {
  const el = cardRef.value?.cardEl
  if (!el) return null
  const scaleWrap = document.getElementById('cardPreviewScale')
  const prevTransform = scaleWrap?.style.transform
  if (scaleWrap) scaleWrap.style.transform = 'none'
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true
    })
    return canvas
  } finally {
    if (scaleWrap) scaleWrap.style.transform = prevTransform || ''
  }
}

const downloadPNG = async () => {
  const canvas = await captureCard()
  if (!canvas) return
  const link = document.createElement('a')
  const emp = selectedEmployee.value
  link.download = `IDCard_${emp?.employeeId || 'employee'}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

const downloadPDF = async () => {
  const canvas = await captureCard()
  if (!canvas) return
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 24
  const w = pageW - margin * 2
  const h = w * (canvas.height / canvas.width)
  pdf.addImage(imgData, 'PNG', margin, (pageH - h) / 2, w, h, undefined, 'FAST')
  const emp = selectedEmployee.value
  pdf.save(`IDCard_${emp?.employeeId || 'employee'}.pdf`)
}

/* ---------------------------- Data Fetch ----------------------------- */
// Keep your API & payload unchanged
const fetchEmployees = async () => {
  isLoading.value = true
  try {
    const res = await axios.get('/employees', { params: { limit: 'all' } })
    employees.value = res.data.employees || []
    totalEmployees.value = res.data.total || employees.value.length
    if (page.value > totalPagesLocal.value) page.value = 1
  } catch (err) {
    console.error('❌ Failed to fetch employees:', err?.message || err)
  } finally {
    isLoading.value = false
  }
}

const selectedEmployee = computed(
  () => employees.value.find(e => e._id === selected.value[0]) || null
)

const openCardDialog = () => {
  if (selected.value.length !== 1) return
  showCardDialog.value = true
}

/* ----------- Filter & Pagination (client-side, unchanged) ----------- */
const toSearchable = (emp) => {
  const parts = [
    emp.employeeId,
    emp.khmerFirstName, emp.khmerLastName,
    emp.englishFirstName, emp.englishLastName,
    emp.gender, emp.email,
    emp.phoneNumber, emp.agentPhoneNumber, emp.agentPerson,
    emp.marriedStatus, emp.spouseName, emp.spouseContactNumber,
    emp.religion, emp.nationality, emp.introducerId,
    emp.department, emp.position, emp.employeeType,
    emp.line, emp.team, emp.section, emp.shift, emp.status,
    emp.sourceOfHiring,
    emp.singleNeedle, emp.overlock, emp.coverstitch, emp.totalMachine,
    emp.education, emp.idCard, emp.nssf, emp.passport,
    emp.remark,
    emp.placeOfBirth?.provinceNameKh, emp.placeOfBirth?.districtNameKh,
    emp.placeOfBirth?.communeNameKh, emp.placeOfBirth?.villageNameKh,
    emp.placeOfLiving?.provinceNameKh, emp.placeOfLiving?.districtNameKh,
    emp.placeOfLiving?.communeNameKh, emp.placeOfLiving?.villageNameKh,
  ]
  return parts
    .flatMap(v => (v && typeof v === 'object') ? Object.values(v) : [v])
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const filteredEmployees = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return employees.value
  return employees.value.filter(emp => toSearchable(emp).includes(term))
})

const totalPagesLocal = computed(() => {
  if (itemsPerPage.value === 'all') return 1
  const perPage = parseInt(itemsPerPage.value)
  if (!perPage || perPage <= 0) return 1
  return Math.max(1, Math.ceil(filteredEmployees.value.length / perPage))
})

const paginatedEmployees = computed(() => {
  if (itemsPerPage.value === 'all') return filteredEmployees.value
  const perPage = parseInt(itemsPerPage.value)
  const start = (page.value - 1) * perPage
  return filteredEmployees.value.slice(start, start + perPage)
})

/* ----------------------------- Selection ---------------------------- */
const toggleSelectAll = () => {
  const currentPageIds = paginatedEmployees.value.map((emp) => emp._id)
  if (selectAll.value) {
    selected.value = [...new Set([...selected.value, ...currentPageIds])]
  } else {
    selected.value = selected.value.filter((id) => !currentPageIds.includes(id))
  }
}

watch([selected, paginatedEmployees], () => {
  const currentPageIds = paginatedEmployees.value.map((emp) => emp._id)
  selectAll.value = currentPageIds.length > 0 &&
    currentPageIds.every((id) => selected.value.includes(id))
})

/* ------------------------ Navigation & Actions ----------------------- */
const useWarn = (title, text='') => Swal.fire({ icon: 'warning', title, text })

const goToAddEmployee = () => router.push('/hrss/addemployee')

const editSelectedEmployee = () => {
  if (selected.value.length !== 1) {
    return useWarn('Please select exactly 1 employee to edit.')
  }
  router.push({ path: '/hrss/addemployee', query: { id: selected.value[0] } })
}

const deleteSelected = async () => {
  if (!selected.value.length) {
    return useWarn('No employees selected')
  }
  const confirm = await Swal.fire({
    icon: 'warning',
    title: `Delete ${selected.value.length} employees?`,
    text: 'This action cannot be undone.',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#e53935'
  })
  if (!confirm.isConfirmed) return

  isLoading.value = true
  try {
    await Promise.all(selected.value.map((id) => axios.delete(`/employees/${id}`)))
    selected.value = []
    selectAll.value = false
    await Swal.fire({ icon: 'success', title: 'Deleted successfully' })
    await fetchEmployees()
  } catch (err) {
    console.error('❌ Deletion failed:', err)
    Swal.fire({ icon: 'error', title: 'Failed to delete', text: err.message })
  } finally {
    isLoading.value = false
  }
}

/* ------------------------------ Export ------------------------------ */
const exportToExcel = () => {
  if (!selected.value.length) {
    return useWarn('Please select at least one employee to export.')
  }
  const exportData = employees.value
    .filter((emp) => selected.value.includes(emp._id))
    .map((emp) => ({
      'Employee ID': emp.employeeId,
      'Khmer Name': `${emp.khmerFirstName} ${emp.khmerLastName}`,
      'English Name': `${emp.englishFirstName} ${emp.englishLastName}`,
      Gender: emp.gender,
      'Date of Birth': formatDate(emp.dob),
      Age: emp.age,
      Email: emp.email,
      'Phone Number': emp.phoneNumber,
      'Agent Phone': emp.agentPhoneNumber,
      'Agent Person': emp.agentPerson,
      'Married Status': emp.marriedStatus,
      'Spouse Name': emp.spouseName,
      'Spouse Contact': emp.spouseContactNumber,
      Education: emp.education,
      Religion: emp.religion,
      Nationality: emp.nationality,
      'Introducer ID': emp.introducerId,
      'Join Date': formatDate(emp.joinDate),
      Department: emp.department,
      Position: emp.position,
      'Employee Type': emp.employeeType,
      Line: emp.line,
      Team: emp.team,
      Section: emp.section,
      Shift: emp.shift,
      Status: emp.status,
      'Source of Hiring': emp.sourceOfHiring,
      'Single Needle': emp.singleNeedle,
      Overlock: emp.overlock,
      Coverstitch: emp.coverstitch,
      'Total Machines': emp.totalMachine,
      'Education Level': emp.education,
      'ID Card': emp.idCard,
      'ID Expire': formatDate(emp.idCardExpireDate),
      NSSF: emp.nssf,
      Passport: emp.passport,
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
      Remark: emp.remark,
      'Created At': formatDate(emp.createdAt),
      'Updated At': formatDate(emp.updatedAt)
    }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees')
  XLSX.writeFile(workbook, 'Employees.xlsx')
}

/* ------------------------------ Import ------------------------------ */
const triggerImportFile = () => fileInput.value?.click()

const renderIssuesHtml = (items, getTitle, getList) =>
  items
    .slice(0, 12)
    .map((it) => `
      <div style="text-align:left;margin-bottom:6px">
        <strong>${getTitle(it)}</strong>
        <ul style="margin:4px 0 0 18px">
          ${getList(it).map((e) => `<li>${e}</li>`).join('')}
        </ul>
      </div>
    `)
    .join('')

const handleImportExcel = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  isLoading.value = true
  try {
    const res = await axios.post('/employees/import-excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const hasPreviewPayload = Array.isArray(res?.data?.toImport) || Array.isArray(res?.data?.invalid)
    if (hasPreviewPayload) {
      const { toImport = [], duplicates = [], invalid = [] } = res.data || {}

      if (invalid.length) {
        const html = renderIssuesHtml(
          invalid,
          (b) => `Row ${b.row}${b.employeeId ? ` (${b.employeeId})` : ''}`,
          (b) => b.errors || []
        )
        await Swal.fire({
          icon: 'error',
          title: 'Some rows have issues — please fix and retry',
          html: `${html}${invalid.length > 12 ? `<em>…and ${invalid.length - 12} more rows</em>` : ''}`
        })
        return
      }

      if (!toImport.length) {
        await Swal.fire({
          icon: 'info',
          title: 'No new data found',
          text: `${duplicates.length} duplicate(s) detected.`
        })
        return
      }

      const confirm = await Swal.fire({
        icon: 'question',
        title: `Import ${toImport.length} new employees?`,
        text: `${duplicates.length} duplicate(s) will be ignored.`,
        showCancelButton: true,
        confirmButtonText: 'Yes, import',
        cancelButtonText: 'Cancel'
      })
      if (!confirm.isConfirmed) return

      const finalRes = await axios.post('/employees/import-confirmed', { toImport })
      const { message, failedCount = 0, failed = [] } = finalRes.data || {}

      if (failedCount) {
        const html = renderIssuesHtml(
          failed,
          (f) => `Row ${f.row}${f.employeeId ? ` (${f.employeeId})` : ''}`,
          (f) => Array.isArray(f.reason) ? f.reason : [String(f.reason || 'Unknown error')]
        )
        await Swal.fire({
          icon: 'warning',
          title: 'Some rows failed to save',
          html: `${html}${failedCount > 12 ? `<em>…and ${failedCount - 12} more rows</em>` : ''}`
        })
      }

      await Swal.fire({ icon: 'success', title: 'Import Complete', text: message || 'Done' })
      await fetchEmployees()
      return
    }

    // direct import response fallback
    const failed = res.data?.failed || []
      if (failed.length) {
          const html = renderIssuesHtml(
            failed,
            (f) => `Row ${f.row}${f.employeeId ? ` (${f.employeeId})` : ''}`,
            (f) => Array.isArray(f.reason) ? f.reason : [String(f.reason || 'Unknown error')]
          )
          await Swal.fire({
            icon: 'warning',
            title: `Import finished — some rows failed (${failed.length})`,
            html: `${html}${failed.length > 12 ? `<em>…and ${failed.length - 12} more rows</em>` : ''}`
          })
        } else {
          await Swal.fire({ icon: 'success', title: 'Import Complete', text: res.data?.message || 'Done' })
     }
    await fetchEmployees()
  } catch (err) {
    console.error('❌ Import failed:', err)
    await Swal.fire({
      icon: 'error',
      title: 'Import Failed',
      text: err?.response?.data?.message || err.message || 'Unknown error'
    })
  } finally {
    isLoading.value = false
    if (event?.target) event.target.value = ''
  }
}

/* ----------------------------- Row Note ----------------------------- */
const updateNote = async (emp) => {
  try {
    await axios.put(`/employees/${emp._id}`, { note: emp.note })
  } catch (err) {
    console.error('❌ Failed to save note:', err?.message || err)
  }
}

/* -------------------------- Table Helpers --------------------------- */
const employeeFields = (emp) => [
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
  { label: 'ABA', value: emp.team },
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
  { label: 'Remark', value: emp.remark }
]

const getRowNumber = (index) => {
  const perPage =
    itemsPerPage.value === 'all'
      ? filteredEmployees.value.length || 1
      : parseInt(itemsPerPage.value)
  return (page.value - 1) * perPage + index + 1
}

const chunkedEmployeeInfo = (emp) => {
  const info = employeeFields(emp)
  const chunked = []
  for (let i = 0; i < info.length; i += 10) chunked.push(info.slice(i, i + 10))
  while (chunked.length < 5) chunked.push([])
  return chunked
}

const getCompletionRate = (emp) => {
  const values = Object.values(emp).flatMap((v) =>
    (typeof v === 'object' && v !== null ? Object.values(v) : [v])
  )
  const filled = values.filter((v) => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / 48) * 100), 100)
}

/* ----------------------------- Watchers ----------------------------- */
watch(q, () => { page.value = 1 })
watch(itemsPerPage, () => { page.value = 1 })
</script>

<style scoped>
/* Layout polish */
.employee-page :deep(.v-toolbar) {
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%);
}

.table-scroll-wrapper {
  overflow: auto;
  max-width: 100%;
  max-height: 70vh;
  border-top: 1px solid #e8e8ef;
  border-bottom: 1px solid #e8e8ef;
  border-radius: 14px;
}

/* Table + sticky headers/cols */
.scrollable-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.scrollable-table thead th {
  position: sticky;
  top: 0;
  background-color: #f6f7fb;
  z-index: 3;
  border-bottom: 1px solid #e5e7f1;
  font-weight: 700;
  letter-spacing: .2px;
  white-space: nowrap;
}

.scrollable-table th,
.scrollable-table td {
  border-right: 1px solid #ececf3;
  border-left: 0;
  padding: 8px 12px;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
  transition: background-color .15s ease;
}

.scrollable-table tbody tr:nth-child(even) {
  background-color: #fafbff;
}

.scrollable-table tbody tr:hover {
  background-color: #eef4ff;
}

/* Sticky columns (left & right) */
.sticky-col {
  position: sticky;
  z-index: 2;
  background: inherit;
}

.sticky-right { right: 0; z-index: 3; }

.profile-img {
  width: 3.8cm;
  height: 3.8cm;
  object-fit: cover;
  display: block;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #e8e8ef inset;
}

.img-cell {
  width: 4.2cm;
  height: 4.2cm;
  padding: 6px;
  text-align: center;
}

.bg-action {
  background-color: #f3f2ee;
  min-width: 160px;
  border-left: 1px solid #e0ded8;
}

.info-block {
  margin-bottom: 6px;
  font-size: 12.5px;
  line-height: 1.25rem;
}

.label {
  font-weight: 600;
  margin-right: 6px;
  color: #4b5563;
}
.value {
  color: #111827;
}

/* Card preview scaling */
.card-preview-wrapper {
  overflow: auto;
  padding: 10px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e5e7eb;
}
.card-preview-scale {
  transform: scale(0.55);
  transform-origin: top left;
}
</style>
