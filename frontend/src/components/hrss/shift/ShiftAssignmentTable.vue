<!-- src/components/hrss/shift/ShiftAssignmentTable.vue -->
<template>
  <v-card class="elevation-0">
    <v-card-title class="text-h6">Current Assignments</v-card-title>

    <v-card-text class="pt-0">
      <!-- Toolbar -->
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <v-text-field
          v-model="q"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search employee, template…"
          variant="outlined"
          density="comfortable"
          hide-details
          class="flex-1-1"
          :disabled="loading"
          @keyup.enter="emitSearch"
          @click:clear="emitSearch"
          clearable
        />
        <v-select
          :items="pageSizeOptions"
          v-model="localPageSize"
          label="Rows"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 120px"
          :disabled="loading"
          @update:model-value="onPageSizeChange"
        />
      </div>

      <!-- Table -->
      <v-table fixed-header height="520">
        <thead>
          <tr>
            <th class="text-no-wrap">#</th>
            <th class="text-no-wrap">Employee</th>
            <th class="text-no-wrap">Template</th>
            <th class="text-no-wrap">Date Range</th>
            <th class="text-no-wrap">Weekdays</th>
            <th class="text-no-wrap">Note</th>
            <th class="text-no-wrap">Created</th>
            <th class="text-no-wrap text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="!loading && (!items || !items.length)">
            <td colspan="8" class="text-center py-10 opacity-70">No assignments</td>
          </tr>

          <tr v-for="(it, idx) in items" :key="it._id || idx">
            <td>{{ rowNumber(idx) }}</td>
            <td>
              <div class="fw-600">{{ it.employeeName || it.employee?.name || it.employeeId }}</div>
              <div class="text-caption opacity-70">
                ID: {{ it.employeeId }} <span v-if="it.department">• {{ it.department }}</span>
              </div>
            </td>
            <td>
              <div class="fw-600">{{ it.templateName || it.template?.name || '—' }}</div>
              <div class="text-caption opacity-70">
                {{ describeTemplate(it.template) }}
              </div>
            </td>
            <td>
              <div>{{ fmtDate(it.startDate) }} – {{ fmtDate(it.endDate) }}</div>
            </td>
            <td>
              <div class="text-caption">{{ formatWeekdays(it.weekdays) }}</div>
            </td>
            <td class="max-w-240">
              <div class="ellipsis-2">{{ it.note || '—' }}</div>
            </td>
            <td class="text-caption">
              {{ fmtDateTime(it.createdAt || it.created_at) }}
            </td>
            <td class="text-right">
              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                :disabled="loading || deletingId === (it._id || it.id)"
                @click="confirmDelete(it)"
              >
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Loading overlay -->
      <v-overlay :model-value="loading" class="align-center justify-center" contained>
        <v-progress-circular indeterminate size="32" />
      </v-overlay>

      <!-- Pagination -->
      <div class="d-flex align-center justify-space-between mt-3">
        <div class="text-caption opacity-70">
          Page {{ page }} / {{ totalPages }}
        </div>

        <v-pagination
          :model-value="page"
          :length="totalPages || 1"
          :disabled="loading"
          density="comfortable"
          @update:model-value="(p) => $emit('page', p)"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import api from '@/utils/axios'

/* ───────── props / emits ───────── */
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  pageSize: { type: [Number, String], default: 50 },
  totalPages: { type: Number, default: 1 },
})
const emit = defineEmits(['page', 'page-size', 'deleted', 'search'])

/* ───────── local state ───────── */
const pageSizeOptions = [10, 20, 50, 100, 200]
const localPageSize = ref(Number(props.pageSize) || 50)
const q = ref('')
const deletingId = ref(null)

watch(() => props.pageSize, v => { localPageSize.value = Number(v) || 50 })

/* ───────── helpers ───────── */
const safePageSize = computed(() => Number(localPageSize.value) || 50)

function fmtDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD') : '—'
}
function fmtDateTime(d) {
  return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '—'
}
function formatWeekdays(arr) {
  if (!Array.isArray(arr) || !arr.length) return '—'
  const map = {0:'Sun',1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat'}
  return arr.map(v => map[v] ?? v).join(', ')
}
function describeTemplate(t) {
  if (!t) return ''
  const bits = []
  if (t.start) bits.push(`Start ${t.start}`)
  if (t.end) bits.push(`End ${t.end}`)
  if (Array.isArray(t.breaks) && t.breaks.length) bits.push(`${t.breaks.length} break(s)`)
  return bits.join(' • ')
}
function rowNumber(idx) {
  return (props.page - 1) * safePageSize.value + idx + 1
}

function onPageSizeChange(val) {
  // reset to first page when page-size changes
  emit('page-size', Number(val))
}

function emitSearch() {
  emit('search', q.value.trim())
}

/* ───────── delete flow ───────── */
async function confirmDelete(it) {
  const id = it._id || it.id
  if (!id) return

  const res = await Swal.fire({
    icon: 'warning',
    title: 'Delete assignment?',
    text: `Employee ID ${it.employeeId} • ${fmtDate(it.startDate)} – ${fmtDate(it.endDate)}`,
    showCancelButton: true,
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d32f2f',
  })
  if (!res.isConfirmed) return

  deletingId.value = id
  try {
    // Adjust endpoint if your backend differs
    await api.delete(`/hrss/shift-assignments/${id}`)
    Swal.fire({ icon: 'success', title: 'Deleted', timer: 900, showConfirmButton: false })
    emit('deleted', id)
  } catch (err) {
    console.error('[ShiftAssignmentTable] delete failed', err)
    const msg = err?.response?.data?.message || err?.message || 'Delete failed'
    Swal.fire({ icon: 'error', title: 'Error', text: msg })
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.fw-600 { font-weight: 600; }
.opacity-70 { opacity: 0.7; }
.max-w-240 { max-width: 240px; }
.ellipsis-2 {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; text-overflow: ellipsis;
}
</style>
