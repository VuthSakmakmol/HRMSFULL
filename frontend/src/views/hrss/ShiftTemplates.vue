<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/axios'
import Swal from 'sweetalert2'
import ShiftTemplateForm from '@/components/hrss/shift/ShiftTemplateForm.vue'

/* ───────── state ───────── */
const loading   = ref(false)
const rows      = ref([])
const q         = ref('')

/* dialog/form state */
const dialogOpen = ref(false)
const formKey    = ref(0)     // force re-mount to reset form
const editingRow = ref(null)  // null=create; object=edit

/* busy state per row (disable/tiny spinners) */
const busyIds = ref(new Set())
const setBusy = (id, v) => {
  const s = new Set(busyIds.value)
  v ? s.add(id) : s.delete(id)
  busyIds.value = s
}

/* helpers */
const toast = (title, icon='success') =>
  Swal.fire({ toast:true, position:'top-end', timer:1500, showConfirmButton:false, icon, title })

/* ───────── data load ───────── */
async function load () {
  loading.value = true
  try {
    const { data } = await api.get('/hrss/shift-templates', { params: { q: q.value || undefined } })
    rows.value = Array.isArray(data) ? data : (data?.data || [])
  } finally {
    loading.value = false
  }
}

/* ───────── CRUD actions ───────── */
function openCreate () {
  editingRow.value = null
  formKey.value++
  dialogOpen.value = true
}
function openEdit (row) {
  editingRow.value = { ...row } // pass a copy
  formKey.value++
  dialogOpen.value = true
}
function closeDialog () {
  dialogOpen.value = false
}

async function handleSaved () {
  await load()
  closeDialog()
  toast('Saved')
}

async function onDelete (row) {
  const { isConfirmed } = await Swal.fire({
    title: `Delete template "${row.name}"?`,
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    allowEnterKey: true,
  })
  if (!isConfirmed) return

  setBusy(row._id, true)
  try {
    await api.delete(`/hrss/shift-templates/${row._id}`)
    // remove from list immediately
    rows.value = rows.value.filter(r => r._id !== row._id)
    toast('Deleted!')
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Delete failed'
    Swal.fire({ icon:'error', title:'Error', text: msg })
  } finally {
    setBusy(row._id, false)
  }
}

async function toggleActive (row) {
  const prev = !!row.active
  row.active = !prev // optimistic
  setBusy(row._id, true)
  try {
    await api.patch(`/hrss/shift-templates/${row._id}`, { active: row.active })
    toast(row.active ? 'Activated' : 'Deactivated')
  } catch (err) {
    row.active = prev // revert
    const msg = err?.response?.data?.message || err.message || 'Update failed'
    Swal.fire({ icon:'error', title:'Error', text: msg })
  } finally {
    setBusy(row._id, false)
  }
}

onMounted(load)
</script>

<template>
  <v-card class="elevation-1 rounded-2xl">
    <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl">
      <v-toolbar-title>Shift Templates</v-toolbar-title>
      <v-spacer />
      <v-text-field
        v-model="q"
        placeholder="Search by name"
        hide-details
        density="compact"
        variant="solo"
        prepend-inner-icon="mdi-magnify"
        class="ma-2"
        style="max-width: 340px"
        @keyup.enter="load"
      />
      <v-btn color="secondary" class="mr-2" @click="openCreate">
        <v-icon start>mdi-plus</v-icon>New Template
      </v-btn>
      <v-btn variant="tonal" @click="load">
        <v-icon start>mdi-refresh</v-icon>Refresh
      </v-btn>
    </v-toolbar>

    <v-table>
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
          <th style="width:128px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r,i) in rows" :key="r._id">
          <td>{{ i + 1 }}</td>
          <td>{{ r.name }}</td>
          <td>{{ r.timeIn }} → {{ r.timeOut }}</td>
          <td>{{ r.lateAfter }}</td>
          <td>
            <template v-if="(r.breaks||[]).length">
              {{ r.breaks.map(b => `${b.start}-${b.end}${b.paid?'(paid)':''}`).join(', ') }}
            </template>
            <span v-else>—</span>
          </td>
          <td>
            <span v-if="r.ot?.mode==='DISABLED'">—</span>
            <span v-else-if="r.ot?.mode==='ANY_MINUTES'">Any (start {{ r.ot?.startAfterMin||0 }}m)</span>
            <span v-else>Tiers: {{ (r.ot?.tiers||[]).join(',') }} (start {{ r.ot?.startAfterMin||0 }}m)</span>
          </td>

          <!-- one-click Active/Inactive -->
          <td>
            <v-btn
              size="x-small"
              :loading="busyIds.has(r._id)"
              :color="r.active ? 'green' : 'grey'"
              variant="tonal"
              class="rounded-pill"
              @click="toggleActive(r)"
            >
              {{ r.active ? 'Active' : 'Inactive' }}
            </v-btn>
          </td>

          <td>{{ r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—' }}</td>

          <td class="text-right">
            <v-btn
              icon size="small" color="primary" variant="text"
              :disabled="busyIds.has(r._id)"
              @click="openEdit(r)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon size="small" color="error" variant="text"
              :loading="busyIds.has(r._id)"
              @click="onDelete(r)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </td>
        </tr>

        <tr v-if="!rows.length">
          <td colspan="9" class="text-medium-emphasis text-center py-8">
            <v-progress-circular v-if="loading" indeterminate />
            <span v-else>No data</span>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>

  <!-- Dialog: Create/Edit -->
  <v-dialog v-model="dialogOpen" max-width="900" scrollable>
    <v-card class="rounded-2xl">
      <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl">
        <v-toolbar-title>{{ editingRow ? 'Edit Shift Template' : 'New Shift Template' }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon variant="text" @click="dialogOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <!-- key forces fresh mount to reset internal state -->
        <ShiftTemplateForm
          :key="formKey"
          :value="editingRow || {}"
          @saved="handleSaved"
          @cancel="dialogOpen = false"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
