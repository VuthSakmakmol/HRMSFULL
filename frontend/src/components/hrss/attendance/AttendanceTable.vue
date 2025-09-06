<template>
  <div class="table-scroll-wrapper">
    <table class="scrollable-table">
      <thead>
        <tr>
          <th class="sticky-col">
            <v-checkbox
              v-model="allSelected"
              :indeterminate="isIndeterminate"
              hide-details
              density="compact"
            />
          </th>
          <th class="sticky-col">#</th>
          <th>Date</th>
          <th>Employee ID</th>
          <th>Full Name</th>
          <th>Department</th>
          <th>Position</th>
          <th>Line</th>
          <th>Time In</th>
          <th>Time Out</th>
          <th>Shift</th>
          <th>Status</th>
          <th>Risk Status</th>
          <th>Evaluate</th>
          <th>Late By</th>
          <th>Overtime</th>
          <th>Type of Leave</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="item._id" class="zebra">
          <td class="sticky-col">
            <v-checkbox v-model="innerSelected" :value="item._id" hide-details density="compact" />
          </td>
          <td class="sticky-col">{{ index + 1 }}</td>
          <td>{{ d(item.date) }}</td>
          <td>{{ item.employeeId }}</td>
          <td>{{ item.fullName }}</td>
          <td>{{ item.department || '-' }}</td>
          <td>{{ item.position || '-' }}</td>
          <td>{{ item.line || '-' }}</td>
          <td>{{ t(item.timeIn) }}</td>
          <td>{{ t(item.timeOut) }}</td>
          <td>{{ item.shiftName || item.shiftType || '-' }}</td>
          <td><v-chip :color="statusColor(item.status)" variant="flat" density="comfortable">{{ statusLabel(item.status) }}</v-chip></td>
          <td><v-chip :color="riskColor(item.riskStatus)" variant="flat" density="comfortable">{{ riskLabel(item.riskStatus) }}</v-chip></td>
          <td><v-chip :color="evalColor(item.evaluate)" variant="flat" density="comfortable">{{ evalLabel(item.evaluate) }}</v-chip></td>
          <td>{{ lateBy(item) }}</td>
          <td>{{ ot(item) }}</td>
          <td><span v-if="item.status === 'Leave'">{{ item.leaveType || '-' }}</span><span v-else>-</span></td>
          <td>
            <v-btn size="small" variant="text" @click="$emit('edit', item)"><v-icon>mdi-pencil</v-icon></v-btn>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="loading" class="loading-overlay">
      <v-progress-circular indeterminate size="40" />
    </div>
  </div>

  <v-row align-center class="mt-2">
    <v-col cols="12" sm="6">
      <v-select
        :model-value="String(pageSize)"
        :items="['20','50','100','All']"
        label="Rows per page"
        variant="outlined"
        density="compact"
        hide-details
        @update:model-value="(v)=>$emit('page-size', v)"
      />
    </v-col>
    <v-col cols="12" sm="6" class="text-right">
      <v-pagination
        v-if="totalPages > 1"
        :model-value="page"
        :length="totalPages"
        density="comfortable"
        total-visible="5"
        @update:model-value="(p)=>$emit('page', p)"
      />
    </v-col>
  </v-row>
</template>

<script setup>
import dayjs from '@/plugins/dayjs'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  page: { type: Number, default: 1 },
  pageSize: { type: [String, Number], default: '50' },
  totalPages: { type: Number, default: 1 },
  selectedIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['page','page-size','update:selected-ids','edit'])

const innerSelected = ref([...props.selectedIds])
watch(() => props.selectedIds, v => innerSelected.value = [...v])
watch(innerSelected, v => emit('update:selected-ids', v))

const allSelected = computed({
  get: () => innerSelected.value.length === props.items.length && props.items.length > 0,
  set: (value) => { innerSelected.value = value ? props.items.map(i => i._id) : [] }
})
const isIndeterminate = computed(() =>
  innerSelected.value.length > 0 && innerSelected.value.length < props.items.length
)

const d = v => v ? dayjs(v).format('YYYY-MM-DD') : '-'
const t = v => v ? dayjs(v).format('HH:mm') : '-'

const statusColor = s => ({ OnTime:'green', Late:'orange', Overtime:'purple', Absent:'red', Leave:'blue' }[s] || 'grey')
const statusLabel = s => ({ OnTime:'On Time', Late:'Late', Overtime:'Overtime', Absent:'Absent', Leave:'Permission' }[s] || s)

const riskColor = r => ({ NearlyAbandon:'yellow-darken-2', Abandon:'deep-orange-accent-4', Risk:'pink-accent-4' }[r] || 'grey')
const riskLabel = r => (!r || r === 'None') ? '-' : r

const evalColor = e => ({ Evaluate1:'green-darken-1', Evaluate2:'blue-darken-2', Evaluate3:'purple-darken-3' }[e] || 'grey')
const evalLabel = e => (!e || e === 'None') ? '-' : e.replace('Evaluate', 'Evaluation ')

// late (uses computed lateMinutes if present)
const lateBy = (row) => Number.isFinite(row?.lateMinutes) ? row.lateMinutes : '-'

// basic OT display from server hours
const ot = (row) => (Number.isFinite(row?.overtimeHours) ? Number(row.overtimeHours).toFixed(2) : '-')
</script>

<style scoped>
.table-scroll-wrapper{position:relative;overflow-x:auto;max-width:100%;border:1px solid #e7e7e7;border-radius:16px;max-height:70vh;overflow-y:auto;}
.scrollable-table{width:max-content;border-collapse:separate;border-spacing:0;font-size:13px;}
.scrollable-table th{position:sticky;top:0;background-color:#f8fafc;z-index:2;font-weight:600;}
.scrollable-table th,.scrollable-table td{border-bottom:1px solid #eee;padding:8px 12px;text-align:center;vertical-align:middle;white-space:nowrap;transition:background-color .2s;}
.scrollable-table tbody tr.zebra:nth-child(odd){background-color:#fcfcfd;}
.scrollable-table tbody tr:hover{background-color:#edf6ff;cursor:pointer;}
.sticky-col{position:sticky;left:0;background:white;z-index:3;box-shadow:1px 0 0 #eee inset;}
.loading-overlay{position:absolute;inset:0;backdrop-filter:blur(1px);display:flex;align-items:center;justify-content:center;}
</style>
