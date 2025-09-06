<template>
  <v-container fluid class="pa-4">
    <v-card class="elevation-1 rounded-2xl">
      <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl" title="Shift Templates">
        <template #append>
          <v-btn variant="flat" color="white" class="mr-2" @click="fetchList">
            <v-icon start>mdi-refresh</v-icon> Refresh
          </v-btn>
          <v-btn color="white" variant="flat" @click="openCreate">
            <v-icon start>mdi-plus</v-icon> New Template
          </v-btn>
        </template>
      </v-toolbar>

      <div class="pa-4">
        <v-text-field v-model="q" label="Search by name" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details class="mb-4" />

        <v-table density="comfortable">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Time</th>
              <th>Late</th>
              <th>Breaks</th>
              <th>OT</th>
              <th>Active</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t,i) in filtered" :key="t._id">
              <td>{{ i+1 }}</td>
              <td>{{ t.name }}</td>
              <td>{{ t.timeIn || '-' }} → {{ t.timeOut || '-' }}</td>
              <td>{{ t.lateAfter || '-' }}</td>
              <td>
                <span v-if="(t.breaks||[]).length">{{ t.breaks.map(b=>`${b.start}-${b.end}${b.paid?'(paid)':''}`).join(', ') }}</span>
                <span v-else>-</span>
              </td>
              <td>
                <span v-if="t.ot?.mode==='TIERS'">Tiers: {{ (t.ot.tiers||[]).join(',') }} (start {{ t.ot.startAfterMin }}m)</span>
                <span v-else-if="t.ot?.mode==='ANY_MINUTES'">Any (start {{ t.ot.startAfterMin }}m)</span>
                <span v-else>None</span>
              </td>
              <td>
                <v-chip :color="t.active ? 'green' : 'grey'" size="small" variant="flat">{{ t.active ? 'Yes' : 'No' }}</v-chip>
              </td>
              <td>{{ fmt(t.updatedAt) }}</td>
              <td class="text-right">
                <v-btn size="small" variant="text" @click="openEdit(t)"><v-icon>mdi-pencil</v-icon></v-btn>
                <v-btn size="small" variant="text" color="error" @click="remove(t)"><v-icon>mdi-delete</v-icon></v-btn>
              </td>
            </tr>
            <tr v-if="!loading && !filtered.length">
              <td colspan="9" class="text-center text-medium-emphasis">No templates</td>
            </tr>
          </tbody>
        </v-table>

        <div v-if="loading" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate />
        </div>
      </div>
    </v-card>

    <!-- Dialog -->
    <v-dialog v-model="dialog" max-width="860">
      <v-card class="rounded-2xl">
        <v-card-title class="text-h6 font-weight-bold">{{ editing? 'Edit Template' : 'New Template' }}</v-card-title>
        <v-card-text>
          <ShiftTemplateForm :value="form" :loading="saving" @save="save" @cancel="dialog=false" />
          <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from '@/plugins/dayjs'
import ShiftTemplateForm from '@/components/hrss/shift/ShiftTemplateForm.vue'
import { useShiftApi } from '@/composables/hrss/useShiftApi'

const { listTemplates, createTemplate, updateTemplate, deleteTemplate } = useShiftApi()

const items = ref([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const error = ref('')
const editing = ref(false)
const form = ref({})
const q = ref('')

const fmt = (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'

const fetchList = async () => {
  loading.value = true
  try {
    items.value = await listTemplates({ limit: 500 })
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const filtered = computed(() => {
  const k = q.value.trim().toLowerCase()
  if (!k) return items.value
  return items.value.filter(t => (t.name || '').toLowerCase().includes(k))
})

const openCreate = () => {
  error.value = ''
  editing.value = false
  form.value = {
    name: '',
    timeIn: '', lateAfter: '', timeOut: '',
    breaks: [],
    ot: { mode: 'ANY_MINUTES', startAfterMin: 1, tiers: [] },
    window: { earliestIn: '', latestIn: '', allowCrossMidnight: false },
    active: true
  }
  dialog.value = true
}

const openEdit = (row) => {
  error.value = ''
  editing.value = true
  form.value = JSON.parse(JSON.stringify(row))
  dialog.value = true
}

const save = async (payload) => {
  error.value = ''
  saving.value = true
  try {
    if (editing.value && form.value._id) {
      await updateTemplate(form.value._id, payload)
    } else {
      await createTemplate(payload)
    }
    dialog.value = false
    await fetchList()
  } catch (e) {
    error.value = e?.response?.data?.message || e.message || 'Save failed'
  } finally {
    saving.value = false
  }
}

const remove = async (row) => {
  if (!confirm(`Delete template "${row.name}"?`)) return
  try {
    await deleteTemplate(row._id)
    await fetchList()
  } catch (e) {
    alert(e?.response?.data?.message || e.message || 'Delete failed')
  }
}
</script>
