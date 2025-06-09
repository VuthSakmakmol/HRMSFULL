<template>
  <v-container class="pa-4" fluid>
    <!-- Title + Add Button -->
    <v-row class="mb-4" align-center="center" justify="space-between">
      <v-col cols="auto">
        <h2 class="text-h6 font-weight-bold">Roadmap HC Management</h2>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="auto">
        <v-btn color="primary" @click="openCreateDialog" variant="outlined" class="hover-filled addnew-hover">Add New Roadmap</v-btn>
    </v-col>
    </v-row>

    <!-- Filters -->
    <v-row dense class="mb-4">
      <v-col cols="12" md="2">
        <v-select v-model="filterYear" :items="yearOptions" label="Filter by Year" clearable variant="outlined" density="compact" hide-details dense />
      </v-col>
      <v-col cols="12" md="2">
        <v-select v-model="filterType" :items="['White Collar', 'Blue Collar']" label="Filter by Type" clearable variant="outlined" density="compact" hide-details dense />
      </v-col>
      <v-col cols="12" md="2" v-if="filterType === 'Blue Collar'">
        <v-select v-model="filterSubType" :items="['Sewer', 'Non-Sewer']" label="Filter by SubType" clearable variant="outlined" density="compact" />
      </v-col>
      <v-col cols="12" md="2">
        <v-select v-model="filterMonth" :items="monthOptions" label="Filter by Month" clearable variant="outlined" density="compact"/>
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="green" class="filled-hover filter-hover" variant="outlined" @click="fetchRoadmaps">Apply Filter</v-btn>
      </v-col>
    </v-row>

    <!-- Table -->
    <div class="roadmap-table-wrapper">
      <v-table density="compact" class="rounded">
        <thead>
          <tr>
            <th>Year</th>
            <th>Month</th>
            <th>Type</th>
            <th>Roadmap HC</th>
            <th>Actual HC</th>
            <th>Hiring Target HC</th>
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
              <v-btn size="small" variant="tonal" color="primary" @click="editRoadmap(item)">Edit</v-btn>
              <v-btn size="small" variant="tonal" color="error" @click="deleteRoadmap(item._id)">Delete</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">{{ editMode ? 'Edit Roadmap' : 'Create Roadmap' }}</v-card-title>
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
                <v-select v-model="form.type" :items="['White Collar', 'Blue Collar']" label="Type" required />
              </v-col>

              <v-col cols="12" sm="6" v-if="form.type === 'Blue Collar'">
                <v-select v-model="form.subType" :items="['Sewer', 'Non-Sewer']" label="SubType" required />
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
const filterSubType = ref('')
const filterMonth = ref('')
const dialog = ref(false)
const editMode = ref(false)
const selectedId = ref(null)

const form = ref({
  year: '',
  months: [],
  type: '',
  subType: '',
  roadmapHC: '',
  actualHC: '',
  hiringTargetHC: ''
})

const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i)
const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatType = (type, subType) => {
  if (type === 'White Collar') return 'White Collar'
  if (type === 'Blue Collar') return `Blue Collar - ${subType}`
  return type
}

const fetchRoadmaps = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    const company = user?.role === 'GeneralManager'
      ? localStorage.getItem('company')
      : user?.company

    if (!company) {
      console.warn('⚠️ No company found in localStorage')
      Swal.fire('Missing Company', 'Company not found', 'error')
      return
    }

    let url = '/roadmaps'
    const params = []
    params.push(`company=${company.trim().toUpperCase()}`)
    if (filterYear.value) params.push(`year=${filterYear.value}`)
    if (filterType.value) params.push(`type=${filterType.value}`)
    if (filterSubType.value && filterType.value === 'Blue Collar') {
      params.push(`subType=${filterSubType.value}`)
    }
    if (filterMonth.value) params.push(`month=${filterMonth.value}`)
    if (params.length) url += '?' + params.join('&')

    const res = await api.get(url)
    console.log('📊 Roadmaps fetched:', res.data.length)
    roadmaps.value = res.data.slice(0, 100) // 🧊 Limit to 100 rows to prevent freezing

  } catch (err) {
    console.error('❌ Failed to fetch roadmaps:', err)
    Swal.fire('Error', 'Failed to fetch roadmap data', 'error')
  }
}

const openCreateDialog = () => {
  resetForm()
  dialog.value = true
  editMode.value = false
}

const editRoadmap = (item) => {
  form.value = {
    year: item.year,
    months: [item.month],
    type: item.type,
    subType: item.subType || '',
    roadmapHC: item.roadmapHC,
    actualHC: item.actualHC,
    hiringTargetHC: item.hiringTargetHC
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
      Swal.fire({ icon: 'error', title: 'Missing Company', text: 'Company not found' })
      return
    }

    const payload = {
      year: form.value.year,
      roadmapHC: form.value.roadmapHC,
      actualHC: form.value.actualHC,
      hiringTargetHC: form.value.hiringTargetHC,
      type: form.value.type,
      subType: form.value.type === 'Blue Collar' ? form.value.subType : null,
      company
    }

    if (editMode.value) {
      await api.put(`/roadmaps/${selectedId.value}`, {
        ...payload,
        month: form.value.months[0]
      })

      await Swal.fire('Updated', 'Roadmap updated successfully', 'success')
      dialog.value = false
      fetchRoadmaps()
    } else {
      const failed = []
      const success = []

      for (const month of form.value.months) {
        try {
          await api.post('/roadmaps', { ...payload, month })
          success.push(month)
        } catch (err) {
          failed.push(month)
        }
      }

      dialog.value = false // ✅ Always close the form

      if (success.length && failed.length) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial Success',
          html: `Some months already exist:<br><b>${failed.join(', ')}</b>`,
          confirmButtonText: 'OK'
        })
        fetchRoadmaps()
      } else if (failed.length && !success.length) {
        await Swal.fire({
          icon: 'error',
          title: 'Duplicate Entries',
          html: `All selected months already exist:<br><b>${failed.join(', ')}</b>`,
          confirmButtonText: 'OK'
        })
        // ❌ Do not reload — just close form
      } else {
        await Swal.fire('Success', 'Roadmaps created successfully', 'success')
        fetchRoadmaps()
      }
    }

  } catch (err) {
    console.error('❌ Save error:', err)
    await Swal.fire('Error', 'Failed to save roadmap', 'error')
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
      await api.delete(`/roadmaps/${id}`)
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
    type: '',
    subType: '',
    roadmapHC: '',
    actualHC: '',
    hiringTargetHC: ''
  }
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

/* Filter */
.hover-filled {
  transition: background-color 0.3s ease, color 0.3s ease;
}
.addnew-hover:hover {
  background-color: #1976d2 !important;
  color: white !important;
}
.filter-hover:hover {
  background-color: #43a047 !important;
  color: white !important;
 }

</style>
