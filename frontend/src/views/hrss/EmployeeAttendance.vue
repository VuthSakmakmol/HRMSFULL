<template>
  <v-container fluid class="pa-4">
    <v-card class="mb-4 elevation-1 rounded-2xl">
      <AttendanceToolbar
        :import-prog="importProg"
        @refresh="fetchData"
        @open-calendar="calendarDialog = true"
        @import="onImport"
      />
      <div class="pa-4">
        <AttendanceFilters
          :templates="shiftTemplates"
          v-model:template-id="filters.shiftTemplateId"
          v-model:shift-name="filters.shiftName"
          v-model:search="filters.searchText"
          v-model:date="filters.date"
          @changed="onFiltersChanged"
        />
      </div>
    </v-card>

    <!-- Monthly Heatmap (unchanged) -->
    <AttendanceHeatmap :date="filters.date" class="mb-4" @reload="fetchData" />

    <!-- Actions -->
    <v-card class="mb-3 elevation-1 rounded-2xl">
      <div class="pa-3">
        <v-row align="center" dense>
          <v-col cols="auto">
            <v-btn color="secondary" :disabled="selectedIds.length !== 1" class="rounded-xl" @click="startEvaluation">
              <v-icon start>mdi-account-check</v-icon> Evaluate
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn color="primary" :disabled="selectedIds.length !== 1" class="rounded-xl" @click="openEdit">
              <v-icon start>mdi-pencil</v-icon> Edit
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn color="error" :disabled="selectedIds.length === 0" class="rounded-xl" @click="deleteSelected">
              <v-icon start>mdi-delete</v-icon> Delete
            </v-btn>
          </v-col>
        </v-row>
      </div>
    </v-card>

    <!-- Table -->
    <v-card class="elevation-1 rounded-2xl">
      <AttendanceTable
        :items="rows"
        :loading="isLoading"
        :page="pagination.page"
        :page-size="pagination.limit"
        :total-pages="pagination.totalPages"
        :selected-ids="selectedIds"
        @update:selected-ids="(v)=> selectedIds = v"
        @page="onPageChange"
        @page-size="onPageSizeChange"
        @edit="openEditByRecord"
      />
    </v-card>

    <!-- Edit Dialog -->
    <EditAttendanceDialog
      v-model="editDialog"
      :loading="editLoading"
      :value="editForm"
      @save="submitEdit"
    />

    <!-- Calendar -->
    <WorkCalendarDialog v-model="calendarDialog" @saved="fetchData" />
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import dayjs from '@/plugins/dayjs'
import { useRouter } from 'vue-router'

// components
import AttendanceToolbar from '@/components/hrss/attendance/AttendanceToolbar.vue'
import AttendanceFilters from '@/components/hrss/attendance/AttendanceFilters.vue'
import AttendanceTable from '@/components/hrss/attendance/AttendanceTable.vue'
import EditAttendanceDialog from '@/components/hrss/attendance/EditAttendanceDialog.vue'
import AttendanceHeatmap from '@/components/hrss/AttendanceHeatmap.vue'
import WorkCalendarDialog from '@/components/hrss/WorkCalendarDialog.vue'

// composables
import { useAttendanceApi } from '@/composables/hrss/useAttendanceApi'
import { useImportAttendance } from '@/composables/hrss/useImportAttendance'

const router = useRouter()

/* ───────── state ───────── */
const isLoading = ref(false)
const rows = ref([])
const selectedIds = ref([])

const pagination = reactive({
  page: 1,
  limit: '50',
  totalPages: 1,
})

const filters = reactive({
  shiftTemplateId: '',
  shiftName: '',                // legacy fallback / quick typing
  searchText: '',
  date: dayjs().format('YYYY-MM-DD')
})

const editDialog = ref(false)
const editLoading = ref(false)
const editForm = ref({
  _id: '', employeeId: '', fullName: '', date: '',
  status: '', leaveType: '', riskStatus: 'None', overtimeHours: 0, note: ''
})
const calendarDialog = ref(false)
const shiftTemplates = ref([])

/* ───────── api + import ───────── */
const { listPaginated, updateAttendance, deleteAttendance, listShiftTemplates } = useAttendanceApi()
const { importProg, importExcel } = useImportAttendance({ onAfterCommit: () => fetchData() })

/* ───────── actions ───────── */
const fetchData = async () => {
  try {
    isLoading.value = true
    const res = await listPaginated({
      page: pagination.page,
      limit: pagination.limit,
      date: filters.date,
      shiftTemplateId: filters.shiftTemplateId || undefined,
      shiftName: filters.shiftName || undefined,
      search: filters.searchText || undefined, // server can ignore if not supported
    })
    rows.value = Array.isArray(res.records) ? res.records : []
    pagination.totalPages = res.totalPages || 1
  } finally {
    isLoading.value = false
  }
}

const loadTemplates = async () => {
  const list = await listShiftTemplates()
  shiftTemplates.value = list
}

onMounted(async () => {
  await Promise.all([fetchData(), loadTemplates()])
})

const onFiltersChanged = () => {
  pagination.page = 1
  fetchData()
}

const onPageChange = (p) => { pagination.page = p; fetchData() }
const onPageSizeChange = (size) => { pagination.limit = size; pagination.page = 1; fetchData() }

const openEdit = () => {
  if (selectedIds.value.length !== 1) return
  const record = rows.value.find(r => r._id === selectedIds.value[0])
  openEditByRecord(record)
}
const openEditByRecord = (record) => {
  if (!record) return
  editForm.value = {
    _id: record._id,
    employeeId: record.employeeId,
    fullName: record.fullName,
    date: dayjs(record.date).format('YYYY-MM-DD'),
    status: record.status,
    leaveType: record.leaveType || '',
    riskStatus: record.riskStatus || 'None',
    overtimeHours: record.overtimeHours || 0,
    note: record.note || ''
  }
  editDialog.value = true
}
const submitEdit = async (payload) => {
  try {
    editLoading.value = true
    await updateAttendance(editForm.value._id, payload)
    editDialog.value = false
    await fetchData()
  } finally {
    editLoading.value = false
  }
}

const deleteSelected = async () => {
  if (selectedIds.value.length === 0) return
  if (!confirm(`Delete ${selectedIds.value.length} records?`)) return
  await Promise.all(selectedIds.value.map(id => deleteAttendance(id)))
  selectedIds.value = []
  fetchData()
}

const startEvaluation = () => {
  if (selectedIds.value.length === 1) router.push(`/hrss/evaluate/${selectedIds.value[0]}`)
}

const onImport = async (file) => {
  await importExcel(file, { selectedDate: filters.date })
}
</script>
