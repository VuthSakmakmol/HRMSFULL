<template>
  <v-container fluid class="pa-4">
    <v-card class="elevation-1 rounded-2xl">
      <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl" title="Assign Shifts">
        <template #append>
          <v-btn variant="flat" color="white" @click="refreshAll">
            <v-icon start>mdi-refresh</v-icon> Refresh
          </v-btn>
        </template>
      </v-toolbar>

      <v-tabs v-model="tab" bg-color="transparent" class="px-4 pt-2">
        <v-tab value="single">Single</v-tab>
        <v-tab value="bulk">Bulk</v-tab>
        <v-tab value="current">Current Assignments</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item value="single">
          <div class="pa-4">
            <ShiftAssignmentForm
              :templates="templates"
              :loading="loading"
              @created="onCreated"
              @resolve="handleResolve"
            />
          </div>
        </v-window-item>

        <v-window-item value="bulk">
          <div class="pa-4">
            <ShiftAssignmentBulk
              :templates="templates"
              :loading="loading"
              @created="onCreated"
            />
          </div>
        </v-window-item>

        <v-window-item value="current">
          <div class="pa-4">
            <ShiftAssignmentTable
              :items="rows"
              :loading="loading"
              :page="pagination.page"
              :page-size="pagination.limit"
              :total-pages="pagination.totalPages"
              @page="(p)=>{pagination.page=p; fetchAssignments()}"
              @page-size="(s)=>{pagination.limit=s; pagination.page=1; fetchAssignments()}"
              @deleted="fetchAssignments"
            />
          </div>
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useShiftApi } from '@/composables/hrss/useShiftApi'
import ShiftAssignmentForm from '@/components/hrss/shift/ShiftAssignmentForm.vue'
import ShiftAssignmentBulk from '@/components/hrss/shift/ShiftAssignmentBulk.vue'
import ShiftAssignmentTable from '@/components/hrss/shift/ShiftAssignmentTable.vue'

const tab = ref('single')
const loading = ref(false)
const templates = ref([])
const rows = ref([])

const pagination = reactive({
  page: 1,
  limit: '50',
  totalPages: 1,
})

const { listTemplates, listAssignments } = useShiftApi()

const fetchTemplates = async () => { templates.value = await listTemplates({ active:true, limit:200 }) }
const fetchAssignments = async () => {
  loading.value = true
  try {
    const res = await listAssignments({ page: pagination.page, limit: pagination.limit })
    rows.value = res.records || []
    pagination.totalPages = res.totalPages || 1
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([fetchTemplates(), fetchAssignments()])
}

const onCreated = async () => {
  tab.value = 'current'
  await fetchAssignments()
}

const handleResolve = () => {} // optional hook

onMounted(refreshAll)
</script>
