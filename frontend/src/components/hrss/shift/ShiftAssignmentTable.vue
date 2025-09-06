<template>
  <div class="table-scroll-wrapper">
    <table class="scrollable-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Employee ID</th>
          <th>Template</th>
          <th>From</th>
          <th>To</th>
          <th>Reason</th>
          <th>Created</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(a, i) in items" :key="a._id" class="zebra">
          <td>{{ i + 1 + (page - 1) * (pageSize === 'All' ? items.length : Number(pageSize)) }}</td>
          <td>{{ a.employeeId }}</td>
          <td>{{ a.template?.name || a.shiftTemplateName || '-' }}</td>
          <td>{{ d(a.from) }}</td>
          <td>{{ a.to ? d(a.to) : '-' }}</td>
          <td>{{ a.reason || '-' }}</td>
          <td>{{ dts(a.createdAt) }}</td>
          <td>{{ dts(a.updatedAt) }}</td>
          <td>
            <v-btn size="small" variant="text" color="error" @click="remove(a)"><v-icon>mdi-delete</v-icon></v-btn>
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
import { useShiftApi } from '@/composables/hrss/useShiftApi'

const props = defineProps({
  items: { type:Array, default:()=>[] },
  loading: Boolean,
  page: { type:Number, default:1 },
  pageSize: { type:[String,Number], default:'50' },
  totalPages: { type:Number, default:1 }
})
const emit = defineEmits(['page','page-size','deleted'])

const { deleteAssignment } = useShiftApi()

const d  = v => v ? dayjs(v).format('YYYY-MM-DD') : '-'
const dts = v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'

const remove = async (row) => {
  if (!confirm(`Delete assignment for ${row.employeeId}?`)) return
  try {
    await deleteAssignment(row._id)
    emit('deleted')
  } catch (e) {
    alert(e?.response?.data?.message || e.message || 'Failed to delete')
  }
}
</script>

<style scoped>
.table-scroll-wrapper{position:relative;overflow-x:auto;max-width:100%;border:1px solid #e7e7e7;border-radius:16px;max-height:70vh;overflow-y:auto;}
.scrollable-table{width:max-content;border-collapse:separate;border-spacing:0;font-size:13px;}
.scrollable-table th{position:sticky;top:0;background-color:#f8fafc;z-index:2;font-weight:600;}
.scrollable-table th,.scrollable-table td{border-bottom:1px solid #eee;padding:8px 12px;text-align:center;vertical-align:middle;white-space:nowrap;transition:background-color .2s;}
.scrollable-table tbody tr.zebra:nth-child(odd){background-color:#fcfcfd;}
.scrollable-table tbody tr:hover{background-color:#edf6ff;cursor:pointer;}
.loading-overlay{position:absolute;inset:0;backdrop-filter:blur(1px);display:flex;align-items:center;justify-content:center;}
</style>
