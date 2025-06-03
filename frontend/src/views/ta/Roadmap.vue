<template>
  <v-container>
    <!-- Title + Add Button -->
    <v-row class="mb-4" align="center" justify="space-between">
      <v-col cols="auto">
        <h2 class="text-h6 font-weight-bold">Roadmap HC Management</h2>
      </v-col>
      <v-col cols="auto">
        <v-btn color="primary" @click="openCreateDialog">Add New</v-btn>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-row dense class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="filterYear" :items="yearOptions" label="Filter by Year" clearable />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="filterType" :items="typeOptions" label="Filter by Type" clearable />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="filterMonth" :items="monthOptions" label="Filter by Month" clearable />
      </v-col>
      <v-col cols="12" md="4">
        <v-btn color="primary" @click="fetchRoadmaps">Apply Filter</v-btn>
      </v-col>
    </v-row>

    <!-- Roadmap Table -->
    <div class="roadmap-table-wrapper">
      <v-table density="compact" class="rounded">
        <thead>
          <tr>
            <th>Year</th>
            <th>Month</th>
            <th>Type</th>
            <th>Roadmap HC from planning</th>
            <th>Actual HC (end of month)</th>
            <th>Hiring Target (HC)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in roadmaps" :key="item._id">
            <td>{{ item.year }}</td>
            <td>{{ item.month }}</td>
            <td>{{ formatType(item.type, item.subType) }}</td>
            <td>{{ item.roadmapHC }}</td>
            <td>{{ item.actualHC }}</td>
            <td>{{ item.hiringTargetHC }}</td>
            <td>
              <div class="action-btn-group">
                <v-btn size="small" variant="tonal" color="primary" @click="editRoadmap(item)">Edit</v-btn>
                <v-btn size="small" variant="tonal" color="error" @click="deleteRoadmap(item._id)">Delete</v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">
          {{ editMode ? 'Edit Roadmap' : 'Create Roadmap' }}
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-form @submit.prevent="saveRoadmap">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-select v-model="form.year" :items="yearOptions" label="Year" required />
              </v-col>

              <v-col cols="12">
                <div class="text-subtitle-2 font-weight-bold mb-2">Select Months</div>
                <v-row>
                  <v-col v-for="month in monthOptions" :key="month" cols="6" sm="4">
                    <v-checkbox v-model="form.months" :label="month" :value="month" density="compact" hide-details />
                  </v-col>
                </v-row>
              </v-col>

              <v-col cols="12" sm="6">
                <v-select v-model="form.type" :items="typeOptions" label="Type" required />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field v-model="form.roadmapHC" type="number" label="Roadmap HC" required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.actualHC" type="number" label="Actual HC" required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.hiringTargetHC" type="number" label="Hiring Target HC" required />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="justify-end">
          <v-btn variant="tonal" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveRoadmap">{{ editMode ? 'Update' : 'Create' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Swal from 'sweetalert2'
import api from '@/utils/axios'

const roadmaps = ref([])
const filterYear = ref('')
const filterType = ref('')
const filterMonth = ref('')
const dialog = ref(false)
const editMode = ref(false)
const selectedId = ref(null)

const form = ref({
  year: '',
  months: [],
  roadmapHC: '',
  actualHC: '',
  hiringTargetHC: '',
  type: ''
})

const typeOptions = ['White Collar', 'Blue Collar - Sewer', 'Blue Collar - Non-Sewer']
const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i)
const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatType = (type, subType) => {
  if (type === 'White Collar') return 'White Collar'
  if (type === 'Blue Collar' && subType) return `Blue Collar - ${subType}`
  return type
}

const fetchRoadmaps = async () => {
  try {
    let url = '/roadmap'
    const params = []
    if (filterYear.value) params.push(`year=${filterYear.value}`)
    if (filterType.value) params.push(`type=${filterType.value}`)
    if (filterMonth.value) params.push(`month=${filterMonth.value}`)
    if (params.length) url += '?' + params.join('&')

    const res = await api.get(url)
    roadmaps.value = res.data
  } catch (err) {
    console.error(err)
  }
}

const openCreateDialog = () => {
  resetForm()
  editMode.value = false
  dialog.value = true
}

const editRoadmap = (item) => {
  form.value = {
    ...item,
    months: [item.month],
    type: formatType(item.type, item.subType)
  }
  selectedId.value = item._id
  editMode.value = true
  dialog.value = true
}

const saveRoadmap = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    const company = user?.role === 'GeneralManager'
      ? localStorage.getItem('company')
      : user?.company

    if (!company) {
      Swal.fire({ icon: 'error', title: 'Missing Company', text: 'Company not found in localStorage' })
      return
    }

    const { type, subType } = parseType(form.value.type)

    if (editMode.value) {
      await api.put(`/roadmap/${selectedId.value}`, {
        ...form.value,
        month: form.value.months[0],
        type,
        subType,
        company
      })
      Swal.fire('Success', 'Roadmap updated successfully', 'success')
    } else {
      for (const month of form.value.months) {
        await api.post('/roadmap', {
          ...form.value,
          month,
          type,
          subType,
          company
        })
      }
      Swal.fire('Success', 'Roadmap created successfully', 'success')
    }

    dialog.value = false
    fetchRoadmaps()
  } catch (err) {
    console.error(err)
    Swal.fire('Error', 'Failed to save roadmap', 'error')
  }
}


const deleteRoadmap = async (id) => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'This will delete the roadmap entry!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!'
  })

  if (result.isConfirmed) {
    try {
      await api.delete(`/roadmap/${id}`)
      Swal.fire('Deleted!', 'Roadmap entry has been deleted.', 'success')
      fetchRoadmaps()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Failed to delete roadmap', 'error')
    }
  }
}

const resetForm = () => {
  form.value = {
    year: '',
    months: [],
    roadmapHC: '',
    actualHC: '',
    hiringTargetHC: '',
    type: ''
  }
}

const parseType = (typeString) => {
  if (typeString === 'White Collar') return { type: 'White Collar', subType: null }
  if (typeString === 'Blue Collar - Sewer') return { type: 'Blue Collar', subType: 'Sewer' }
  if (typeString === 'Blue Collar - Non-Sewer') return { type: 'Blue Collar', subType: 'Non-Sewer' }
  return { type: typeString, subType: null }
}


onMounted(fetchRoadmaps)
</script>

<style scoped>
.roadmap-table-wrapper {
  overflow-x: auto;
  width: 100%;
}
.roadmap-table-wrapper table {
  min-width: 1000px;
  white-space: nowrap;
}
.action-btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  align-items: center;
}
.roadmap-table-wrapper td,
.roadmap-table-wrapper th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
