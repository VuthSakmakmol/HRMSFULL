<template>
  <v-container fluid class="pa-4">
    <v-card class="mb-4 elevation-1 rounded-2xl">
      <AttendanceToolbar
        :import-prog="importProg"
        @refresh="fetchData"
        @open-calendar="calendarDialog = true"
        @import="openImportDialog"
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

    <AttendanceHeatmap :date="filters.date" class="mb-4" @reload="fetchData" />

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

    <v-card class="elevation-1 rounded-2xl">
      <AttendanceTable
        :items="rows"
        :loading="isLoading"
        :page="pagination.page"
        :page-size="pagination.limit"
        :total-pages="pagination.totalPages"
        :selected-ids="selectedIds"
        @update:selected-ids="v => (selectedIds = v)"
        @page="onPageChange"
        @page-size="onPageSizeChange"
        @edit="openEditByRecord"
      />
    </v-card>

    <EditAttendanceDialog v-model="editDialog" :loading="editLoading" :value="editForm" @save="submitEdit" />
    <WorkCalendarDialog v-model="calendarDialog" @saved="fetchData" />

    <ImportAttendanceDialog v-model="importDialog" :selected-date="filters.date" @done="onImported" />
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import dayjs from '@/plugins/dayjs'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

import AttendanceToolbar from '@/components/hrss/attendance/AttendanceToolbar.vue'
import AttendanceFilters from '@/components/hrss/attendance/AttendanceFilters.vue'
import AttendanceTable from '@/components/hrss/attendance/AttendanceTable.vue'
import EditAttendanceDialog from '@/components/hrss/attendance/EditAttendanceDialog.vue'
import AttendanceHeatmap from '@/components/hrss/AttendanceHeatmap.vue'
import WorkCalendarDialog from '@/components/hrss/WorkCalendarDialog.vue'
import ImportAttendanceDialog from '@/components/hrss/attendance/ImportAttendanceDialog.vue'

import { useAttendanceApi } from '@/composables/hrss/useAttendanceApi'
import { useImportAttendance } from '@/composables/hrss/useImportAttendance'

const router = useRouter()

const isLoading = ref(false)
const rows = ref([])
let selectedIds = ref([])

const pagination = reactive({ page: 1, limit: '50', totalPages: 1 })
const filters = reactive({
  shiftTemplateId: '', shiftName: '', searchText: '', date: dayjs().format('YYYY-MM-DD'),
})

const editDialog = ref(false)
const editLoading = ref(false)
const editForm = ref({
  _id:'', employeeId:'', fullName:'', date:'', status:'', leaveType:'', riskStatus:'None', overtimeHours:0, note:''
})
const calendarDialog = ref(false)
const shiftTemplates = ref([])
const importDialog = ref(false)

const { listPaginated, updateAttendance, deleteAttendance, listShiftTemplates } = useAttendanceApi()
const { importProg } = useImportAttendance({ onAfterCommit: async () => {} })

const fetchData = async () => {
  try {
    isLoading.value = true
    const res = await listPaginated({
      page: pagination.page, limit: pagination.limit, date: filters.date,
      shiftTemplateId: filters.shiftTemplateId || undefined,
      shiftName: filters.shiftName || undefined,
      search: filters.searchText || undefined,
    })
    rows.value = Array.isArray(res.records) ? res.records : []
    pagination.totalPages = res.totalPages || 1
    if (pagination.page > pagination.totalPages && pagination.totalPages > 0) {
      pagination.page = pagination.totalPages
      const res2 = await listPaginated({
        page: pagination.page, limit: pagination.limit, date: filters.date,
        shiftTemplateId: filters.shiftTemplateId || undefined,
        shiftName: filters.shiftName || undefined,
        search: filters.searchText || undefined,
      })
      rows.value = Array.isArray(res2.records) ? res2.records : []
    }
  } finally { isLoading.value = false }
}

const openImportDialog = () => { importDialog.value = true }
const onImported = async (payload) => {
  if (payload?.importDate) filters.date = dayjs(payload.importDate).format('YYYY-MM-DD')
  pagination.page = 1; await fetchData()
}

const loadTemplates = async () => {
  try { shiftTemplates.value = await listShiftTemplates() } catch { shiftTemplates.value = [] }
}
onMounted(async () => { await Promise.all([fetchData(), loadTemplates()]) })

const onFiltersChanged = () => { pagination.page = 1; fetchData() }
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
    _id: record._id, employeeId: record.employeeId, fullName: record.fullName,
    date: dayjs(record.date).format('YYYY-MM-DD'), status: record.status,
    leaveType: record.leaveType || '', riskStatus: record.riskStatus || 'None',
    overtimeHours: record.overtimeHours || 0, note: record.note || ''
  }
  editDialog.value = true
}
const submitEdit = async (payload) => {
  try { editLoading.value = true; await updateAttendance(editForm.value._id, payload); editDialog.value = false; await fetchData() }
  finally { editLoading.value = false }
}

const deleteSelected = async () => {
  if (selectedIds.value.length === 0) return
  const { isConfirmed } = await Swal.fire({
    title: `Delete ${selectedIds.value.length} record(s)?`, icon:'warning',
    showCancelButton:true, confirmButtonColor:'#d33', cancelButtonColor:'#3085d6',
    confirmButtonText:'Yes, delete', cancelButtonText:'Cancel', reverseButtons:true, allowEnterKey:true
  })
  if (!isConfirmed) return
  await Promise.all(selectedIds.value.map(id => deleteAttendance(id)))
  selectedIds.value = []; await fetchData()
  await Swal.fire({ icon:'success', title:'Deleted', timer:1200, showConfirmButton:false })
}

const startEvaluation = () => {
  if (selectedIds.value.length === 1) router.push(`/hrss/evaluate/${selectedIds.value[0]}`)
}
</script>
