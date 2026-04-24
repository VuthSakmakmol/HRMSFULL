<!-- views/ta/Roadmap.vue -->

<template>
  <v-container class="pa-4" fluid>
    <v-card class="pa-4">
      <!-- Header -->
      <v-row class="mb-4" align="center" justify="space-between">
        <v-col cols="12" md="6">
          <div>
            <h2 class="text-h6 font-weight-bold mb-1">
              Roadmap HC Management
            </h2>
            <p class="text-caption text-medium-emphasis mb-0">
              White Collar is auto generated from Job Requisition. Blue Collar remains manual.
            </p>
          </div>
        </v-col>

        <v-col cols="12" md="6" class="d-flex justify-end">
          <v-btn
            color="primary"
            variant="outlined"
            class="hover-filled addnew-hover"
            @click="openCreateDialog"
          >
            <v-icon start>mdi-plus</v-icon>
            Add Blue Collar Roadmap
          </v-btn>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row dense class="mb-4">
        <v-col cols="12" md="2">
          <v-select
            v-model="filterYear"
            :items="yearOptions"
            label="Year"
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-select
            v-model="filterType"
            :items="['White Collar', 'Blue Collar']"
            label="Type"
            clearable
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="onTypeFilterChange"
          />
        </v-col>

        <v-col cols="12" md="2" v-if="filterType === 'Blue Collar'">
          <v-select
            v-model="filterSubType"
            :items="['Sewer', 'Non-Sewer']"
            label="SubType"
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-select
            v-model="filterMonth"
            :items="monthOptions"
            label="Month"
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="4" class="d-flex align-center ga-2">
          <v-btn
            color="green"
            class="filled-hover filter-hover"
            variant="outlined"
            :loading="isLoading"
            @click="fetchRoadmaps"
          >
            <v-icon start>mdi-filter</v-icon>
            Apply
          </v-btn>

          <v-btn
            color="grey"
            variant="outlined"
            @click="clearFilters"
          >
            Clear
          </v-btn>
        </v-col>
      </v-row>

      <!-- Summary Cards -->
      <v-row dense class="mb-4">
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="blue" class="pa-3">
            <div class="text-caption">Roadmap HC</div>
            <div class="text-h6 font-weight-bold">{{ summary.roadmapHC }}</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card variant="tonal" color="green" class="pa-3">
            <div class="text-caption">Actual HC</div>
            <div class="text-h6 font-weight-bold">{{ summary.actualHC }}</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card variant="tonal" color="orange" class="pa-3">
            <div class="text-caption">Hiring Target HC</div>
            <div class="text-h6 font-weight-bold">{{ summary.hiringTargetHC }}</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card variant="tonal" color="purple" class="pa-3">
            <div class="text-caption">Rows</div>
            <div class="text-h6 font-weight-bold">{{ roadmaps.length }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Table -->
      <div class="roadmap-table-wrapper">
        <v-table density="compact" class="rounded roadmap-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Month</th>
              <th>Type</th>
              <th>Source</th>
              <th class="text-right">Roadmap HC</th>
              <th class="text-right">Actual HC</th>
              <th class="text-right">Hiring Target HC</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in roadmaps" :key="item._id">
              <td>{{ item.year }}</td>
              <td>{{ item.month }}</td>

              <td>
                <v-chip
                  size="small"
                  variant="outlined"
                  :color="item.type === 'White Collar' ? 'blue' : 'teal'"
                >
                  {{ formatType(item.type, item.subType) }}
                </v-chip>
              </td>

              <td>
                <v-chip
                  size="small"
                  :color="isAutoRoadmap(item) ? 'purple' : 'green'"
                  variant="tonal"
                >
                  {{ isAutoRoadmap(item) ? 'Auto' : 'Manual' }}
                </v-chip>
              </td>

              <td class="text-right font-weight-bold">
                {{ item.roadmapHC || 0 }}
              </td>

              <td class="text-right font-weight-bold text-success">
                {{ item.actualHC || 0 }}
              </td>

              <td class="text-right font-weight-bold text-warning">
                {{ item.hiringTargetHC || 0 }}
              </td>

              <td class="text-center">
                <div class="action-btn-group">
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    :disabled="isAutoRoadmap(item)"
                    @click="editRoadmap(item)"
                  >
                    Edit
                  </v-btn>

                  <v-btn
                    size="small"
                    variant="tonal"
                    color="error"
                    :disabled="isAutoRoadmap(item)"
                    @click="deleteRoadmap(item)"
                  >
                    Delete
                  </v-btn>
                </div>
              </td>
            </tr>

            <tr v-if="!isLoading && !roadmaps.length">
              <td colspan="9" class="text-center empty-row">
                No roadmap data found.
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <v-overlay
        :model-value="isLoading"
        class="align-center justify-center"
        persistent
      >
        <v-progress-circular
          indeterminate
          :size="72"
          :width="6"
          color="teal"
        />
      </v-overlay>

      <!-- Create/Edit Dialog -->
      <v-dialog v-model="dialog" max-width="640">
        <v-card>
          <v-card-title class="text-h6 font-weight-bold">
            {{ editMode ? 'Edit Blue Collar Roadmap' : 'Create Blue Collar Roadmap' }}
          </v-card-title>

          <v-divider />

          <v-card-text>
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              White Collar roadmap is created automatically from Job Requisition target headcount.
            </v-alert>

            <v-form @submit.prevent="saveRoadmap">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.year"
                    :items="yearOptions"
                    label="Year"
                    required
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" sm="6" v-if="editMode">
                  <v-select
                    v-model="form.months"
                    :items="monthOptions"
                    label="Month"
                    required
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" v-if="!editMode">
                  <div class="text-subtitle-2 font-weight-bold mb-2">
                    Select Months
                  </div>

                  <v-row>
                    <v-col
                      v-for="month in monthOptions"
                      :key="month"
                      cols="6"
                      sm="4"
                    >
                      <v-checkbox
                        v-model="form.months"
                        :label="month"
                        :value="month"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.type"
                    :items="['Blue Collar']"
                    label="Type"
                    required
                    variant="outlined"
                    density="compact"
                    readonly
                  />
                </v-col>

                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.subType"
                    :items="['Sewer', 'Non-Sewer']"
                    label="SubType"
                    required
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model.number="form.roadmapHC"
                    type="number"
                    min="0"
                    label="Roadmap HC"
                    required
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model.number="form.actualHC"
                    type="number"
                    min="0"
                    label="Actual HC"
                    required
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model.number="form.hiringTargetHC"
                    type="number"
                    min="0"
                    label="Hiring Target HC"
                    required
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-divider />

          <v-card-actions class="justify-end">
            <v-btn variant="tonal" @click="dialog = false">
              Cancel
            </v-btn>

            <v-btn
              color="primary"
              :loading="isSaving"
              @click="saveRoadmap"
            >
              {{ editMode ? 'Update' : 'Create' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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

const isLoading = ref(false)
const isSaving = ref(false)

const form = ref({
  year: '',
  months: [],
  type: 'Blue Collar',
  subType: 'Non-Sewer',
  roadmapHC: 0,
  actualHC: 0,
  hiringTargetHC: 0,
})

const yearOptions = Array.from(
  { length: 10 },
  (_, i) => new Date().getFullYear() - 2 + i
)

const monthOptions = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const getCurrentCompany = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const selectedCompany = localStorage.getItem('company')

  return user?.role === 'GeneralManager'
    ? selectedCompany
    : user?.company
}

const formatType = (type, subType) => {
  if (type === 'White Collar') return 'White Collar'
  if (type === 'Blue Collar') return `Blue Collar - ${subType || 'Non-Sewer'}`
  return type || '-'
}

const isAutoRoadmap = (item) => {
  return item?.type === 'White Collar' || item?.generatedFrom !== 'MANUAL'
}

const summary = computed(() => {
  return roadmaps.value.reduce(
    (acc, item) => {
      acc.roadmapHC += Number(item.roadmapHC || 0)
      acc.actualHC += Number(item.actualHC || 0)
      acc.hiringTargetHC += Number(item.hiringTargetHC || 0)
      return acc
    },
    {
      roadmapHC: 0,
      actualHC: 0,
      hiringTargetHC: 0,
    }
  )
})

const buildParams = () => {
  const company = getCurrentCompany()

  const params = {
    company: String(company || '').trim().toUpperCase(),
  }

  if (filterYear.value) params.year = filterYear.value
  if (filterType.value) params.type = filterType.value

  if (filterType.value === 'Blue Collar' && filterSubType.value) {
    params.subType = filterSubType.value
  }

  if (filterMonth.value) params.month = filterMonth.value

  return params
}

const fetchRoadmaps = async () => {
  try {
    const company = getCurrentCompany()

    if (!company) {
      Swal.fire('Missing Company', 'Company not found', 'error')
      return
    }

    isLoading.value = true

    const res = await api.get('/roadmaps', {
      params: buildParams(),
    })

    roadmaps.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('❌ Failed to fetch roadmaps:', err)

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.response?.data?.message || 'Failed to fetch roadmap data',
    })
  } finally {
    isLoading.value = false
  }
}

const clearFilters = async () => {
  filterYear.value = ''
  filterType.value = ''
  filterSubType.value = ''
  filterMonth.value = ''

  await fetchRoadmaps()
}

const onTypeFilterChange = () => {
  if (filterType.value !== 'Blue Collar') {
    filterSubType.value = ''
  }
}

const openCreateDialog = () => {
  resetForm()
  editMode.value = false
  selectedId.value = null
  dialog.value = true
}

const editRoadmap = (item) => {
  if (isAutoRoadmap(item)) {
    Swal.fire({
      icon: 'info',
      title: 'Auto Roadmap',
      text: 'White Collar roadmap is auto generated from Job Requisition and cannot be edited manually.',
    })
    return
  }

  form.value = {
    year: item.year,
    months: item.month,
    type: 'Blue Collar',
    subType: item.subType || 'Non-Sewer',
    roadmapHC: Number(item.roadmapHC || 0),
    actualHC: Number(item.actualHC || 0),
    hiringTargetHC: Number(item.hiringTargetHC || 0),
  }

  selectedId.value = item._id
  editMode.value = true
  dialog.value = true
}

const saveRoadmap = async () => {
  try {
    const company = getCurrentCompany()

    if (!company) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Company',
        text: 'Company not found',
      })
      return
    }

    if (!form.value.year) {
      Swal.fire('Missing Year', 'Please select year.', 'warning')
      return
    }

    if (!form.value.subType) {
      Swal.fire('Missing SubType', 'Please select Sewer or Non-Sewer.', 'warning')
      return
    }

    const basePayload = {
      year: form.value.year,
      roadmapHC: Number(form.value.roadmapHC || 0),
      actualHC: Number(form.value.actualHC || 0),
      hiringTargetHC: Number(form.value.hiringTargetHC || 0),
      type: 'Blue Collar',
      subType: form.value.subType,
      company,
    }

    isSaving.value = true

    if (editMode.value) {
      const month = Array.isArray(form.value.months)
        ? form.value.months[0]
        : form.value.months

      if (!month) {
        Swal.fire('Missing Month', 'Please select month.', 'warning')
        return
      }

      await api.put(`/roadmaps/${selectedId.value}`, {
        ...basePayload,
        month,
      })

      await Swal.fire('Updated', 'Roadmap updated successfully', 'success')
      dialog.value = false
      await fetchRoadmaps()
      return
    }

    if (!Array.isArray(form.value.months) || !form.value.months.length) {
      Swal.fire('Missing Month', 'Please select at least one month.', 'warning')
      return
    }

    const failed = []
    const success = []

    for (const month of form.value.months) {
      try {
        await api.post('/roadmaps', {
          ...basePayload,
          month,
        })

        success.push(month)
      } catch (err) {
        failed.push({
          month,
          message: err?.response?.data?.message || 'Failed',
        })
      }
    }

    dialog.value = false

    if (success.length && failed.length) {
      await Swal.fire({
        icon: 'warning',
        title: 'Partial Success',
        html: `
          Created: <b>${success.join(', ')}</b><br>
          Failed: <b>${failed.map((f) => f.month).join(', ')}</b>
        `,
      })

      await fetchRoadmaps()
      return
    }

    if (failed.length && !success.length) {
      await Swal.fire({
        icon: 'error',
        title: 'Duplicate or Failed',
        html: failed.map((f) => `<div>${f.month}: ${f.message}</div>`).join(''),
      })

      return
    }

    await Swal.fire('Success', 'Roadmaps created successfully', 'success')
    await fetchRoadmaps()
  } catch (err) {
    console.error('❌ Save error:', err)

    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.response?.data?.message || 'Failed to save roadmap',
    })
  } finally {
    isSaving.value = false
  }
}

const deleteRoadmap = async (item) => {
  if (isAutoRoadmap(item)) {
    Swal.fire({
      icon: 'info',
      title: 'Auto Roadmap',
      text: 'White Collar roadmap is auto generated from Job Requisition and cannot be deleted manually.',
    })
    return
  }

  const result = await Swal.fire({
    title: 'Are you sure?',
    text: `Delete ${formatType(item.type, item.subType)} - ${item.month} ${item.year}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
  })

  if (!result.isConfirmed) return

  try {
    const company = getCurrentCompany()

    await api.delete(`/roadmaps/${item._id}`, {
      params: {
        company,
      },
    })

    await Swal.fire('Deleted!', 'Roadmap entry has been deleted.', 'success')
    await fetchRoadmaps()
  } catch (err) {
    console.error(err)

    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.response?.data?.message || 'Failed to delete roadmap',
    })
  }
}

const resetForm = () => {
  form.value = {
    year: '',
    months: [],
    type: 'Blue Collar',
    subType: 'Non-Sewer',
    roadmapHC: 0,
    actualHC: 0,
    hiringTargetHC: 0,
  }
}

watch(filterType, () => {
  onTypeFilterChange()
})

onMounted(fetchRoadmaps)
</script>

<style scoped>
.roadmap-table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;
  display: block;

  height: clamp(360px, calc(100vh - 360px), 540px);
  max-height: clamp(360px, calc(100vh - 360px), 540px);

  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}

.roadmap-table {
  min-width: 1100px;
  white-space: nowrap;
}

.roadmap-table-wrapper :deep(th) {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #fafafa !important;
  font-weight: 700;
  padding: 10px 14px !important;
  white-space: nowrap;
  border-bottom: 1px solid #ddd;
}

.roadmap-table-wrapper :deep(td) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
  padding: 8px 14px !important;
  height: 52px;
  vertical-align: middle;
  border-bottom: 1px solid #eee;
}

.roadmap-table-wrapper :deep(tbody tr:hover) {
  background-color: #e3f2fd;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.action-btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
}


.empty-row {
  padding: 24px !important;
  color: rgba(0, 0, 0, 0.56);
}

/* Buttons */
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