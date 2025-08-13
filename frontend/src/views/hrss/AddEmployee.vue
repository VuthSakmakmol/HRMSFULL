<template>
  <v-container fluid class="add-employee-page pa-2">
    <!-- Header -->
    <v-card class="mb-3 rounded-xl elevation-1">
      <v-toolbar density="compact" class="rounded-t-xl">
        <v-toolbar-title class="font-weight-bold d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-account-plus</v-icon>
          {{ $t('employeeRegistration') || 'Employee Registration' }}
        </v-toolbar-title>

        <v-spacer />

        <!-- Completion -->
        <v-chip size="small" variant="tonal" color="primary" class="mr-2">
          <v-icon start size="16">mdi-progress-check</v-icon>
          {{ completionPercentage }}%
        </v-chip>

        <!-- Saving state -->
        <v-chip v-if="isSaving" size="small" variant="tonal" color="indigo" class="mr-2">
          <v-progress-circular indeterminate size="14" width="2" class="mr-2" />
          {{ $t('saving') || 'Saving…' }}
        </v-chip>

        <v-btn color="secondary" variant="outlined" @click="router.push('/hrss/employees')">
          <v-icon start>mdi-arrow-left</v-icon>
          {{ $t('backToList') || 'Back to Employee List' }}
        </v-btn>
      </v-toolbar>

      <!-- Stepper (compact, smoke background) -->
      <div class="px-3 pt-1 pb-3">
        <v-row class="align-center">
          <v-col cols="12" md="9">
            <div class="stepper-smoke rounded-xl">
              <v-stepper
                :model-value="step"
                flat
                alt-labels
                class="elevation-0 soft-stepper"
                density="compact"
              >
                <v-stepper-header>
                  <v-stepper-item
                    v-for="(lbl, i) in stepLabels"
                    :key="i"
                    :value="i+1"
                    :title="lbl"
                    :complete="step > (i+1)"
                  />
                </v-stepper-header>
              </v-stepper>
            </div>
          </v-col>

          <v-col cols="12" md="3" class="d-flex align-center">
            <v-progress-linear
              :model-value="completionPercentage"
              color="primary"
              height="10"
              striped
              rounded
              class="flex-grow-1"
            >
              <strong class="text-caption">{{ completionPercentage }}%</strong>
            </v-progress-linear>
          </v-col>
        </v-row>
      </div>
    </v-card>

    <!-- Main: FULL WIDTH -->
    <v-card class="rounded-xl elevation-1 mb-2 full-height-card">
      <component
        :is="stepComponents[step - 1]"
        ref="stepComponent"
        v-model:form="form"
        :isEditMode="isEditMode"
        :step="step"
        @submitEdit="handleStepSubmit"
        @cancelEdit="router.push('/hrss/employees')"
      />
    </v-card>

    <!-- Sticky bottom actions -->
    <v-sheet class="action-bar elevation-2">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div class="d-flex align-center ga-2">
          <v-btn :disabled="step === 1" @click="step--" variant="outlined">
            <v-icon start>mdi-arrow-left</v-icon>
            {{ $t('back') || 'Back' }}
          </v-btn>

          <v-btn color="green" variant="flat" @click="startNewEmployee">
            <v-icon start>mdi-plus</v-icon>
            {{ $t('newEmployee') || 'New Employee' }}
          </v-btn>
        </div>

        <div class="d-flex align-center ga-2">
          <v-btn color="primary" :loading="isSaving" @click="handleStepSubmit">
            <v-icon start>mdi-content-save</v-icon>
            {{ step === stepComponents.length ? ($t('finish') || 'Finish') : ($t('next') || 'Next') }}
            <span class="shortcut-hint">Ctrl+Enter</span>
          </v-btn>
        </div>
      </div>
    </v-sheet>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Swal from 'sweetalert2'
import axios from '@/utils/axios'

// Steps
import Step1 from '@/hrsscomponents/EmployeeSteps/Step1.vue'
import Step2 from '@/hrsscomponents/EmployeeSteps/Step2.vue'
import Step3 from '@/hrsscomponents/EmployeeSteps/Step3.vue'
import Step4 from '@/hrsscomponents/EmployeeSteps/Step4.vue'
import Step5 from '@/hrsscomponents/EmployeeSteps/Step5.vue'

defineOptions({ name: 'AddEmployee' })

/* ───────────────────────── state ───────────────────────── */
const step = ref(parseInt(localStorage.getItem('currentStep') || '1'))
const stepComponents = [Step1, Step2, Step3, Step4, Step5]
const stepLabels = ['Profile', 'Personal', 'Family & Edu', 'Work Info', 'Documents']
const stepComponent = ref(null)

const router = useRouter()
const route = useRoute()

const employeeId = ref(route.query.id || null)
const isEditMode = ref(false)
const isSaving = ref(false)

const emptyAddress = () => ({
  provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: ''
})

const form = ref({
  // profile
  profileImage: '', profileImageFile: null,

  // ids
  employeeId: '',
  company: localStorage.getItem('company') || '',

  // personal
  khmerFirstName: '', khmerLastName: '',
  englishFirstName: '', englishLastName: '',
  gender: '', dob: '', age: null,
  email: '', phoneNumber: '',
  agentPhoneNumber: '', agentPerson: '', note: '',

  // family
  marriedStatus: '', spouseName: '', spouseContactNumber: '',

  // education & religion
  education: '', religion: '', nationality: '', resignReason: '',

  // addresses
  placeOfBirth: emptyAddress(),
  placeOfLiving: emptyAddress(),

  // work
  joinDate: '',
  department: '', position: '', line: '', team: '', section: '',
  shift: '', status: 'Working', resignDate: '', remark: '',
  employeeType: '', sourceOfHiring: '', introducerId: '',

  // skills
  singleNeedle: '', overlock: '', coverstitch: '', totalMachine: null,

  // documents
  idCard: '', idCardExpireDate: '', nssf: '',
  passport: '', passportExpireDate: '', visaExpireDate: '',
  medicalCheck: '', medicalCheckDate: '', workingBook: ''
})

/* ───────────────────────── progress ───────────────────────── */
const TOTAL_FIELDS = 48
const completionPercentage = computed(() => {
  const flat = Object.values(form.value).flatMap(v =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.values(v)
      : [v]
  )
  const filled = flat.filter(v => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / TOTAL_FIELDS) * 100), 100)
})

/* ───────────────────────── persistence ───────────────────────── */
watch(step, newStep => localStorage.setItem('currentStep', String(newStep)))

/* ───────────────────────── loaders ───────────────────────── */
const routerPushList = () => router.push('/hrss/employees')

const loadEmployee = async (id) => {
  if (!id) return
  try {
    const res = await axios.get(`/employees/${id}`)
    const merged = { ...form.value, ...res.data }
    if (!merged.company) merged.company = localStorage.getItem('company') || ''
    form.value = merged
    isEditMode.value = true
    step.value = 1
  } catch (err) {
    console.error('❌ Load failed', err)
    Swal.fire({ icon: 'error', title: 'Load failed', text: err.message })
  }
}

onMounted(async () => {
  if (employeeId.value) await loadEmployee(employeeId.value)
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => route.query.id,
  async (id) => {
    employeeId.value = id || null
    if (employeeId.value) await loadEmployee(employeeId.value)
    else {
      resetForm()
      isEditMode.value = false
      step.value = 1
    }
  }
)

/* ───────────────────────── actions ───────────────────────── */
const resetForm = () => {
  form.value = {
    profileImage: '', profileImageFile: null,
    employeeId: '',
    company: localStorage.getItem('company') || '',
    khmerFirstName: '', khmerLastName: '',
    englishFirstName: '', englishLastName: '',
    gender: '', dob: '', age: null,
    email: '', phoneNumber: '',
    agentPhoneNumber: '', agentPerson: '', note: '',
    marriedStatus: '', spouseName: '', spouseContactNumber: '',
    education: '', religion: '', nationality: '', resignReason: '',
    placeOfBirth: emptyAddress(),
    placeOfLiving: emptyAddress(),
    joinDate: '', department: '', position: '',
    line: '', team: '', section: '',
    shift: '', status: 'Working', resignDate: '', remark: '',
    employeeType: '', sourceOfHiring: '', introducerId: '',
    singleNeedle: '', overlock: '', coverstitch: '', totalMachine: null,
    idCard: '', idCardExpireDate: '', nssf: '',
    passport: '', passportExpireDate: '', visaExpireDate: '',
    medicalCheck: '', medicalCheckDate: '', workingBook: ''
  }
}

const handleStepSubmit = async () => {
  try {
    isSaving.value = true

    // Let child step upload image if it exposes handleFileUpload()
    const uploader = stepComponent.value?.handleFileUpload
    if (typeof uploader === 'function') {
      const imageUrl = await uploader()
      if (imageUrl) form.value.profileImage = imageUrl
    }

    // Create vs Update
    if (!employeeId.value) {
      const payload = { ...form.value }
      delete payload._id
      const res = await axios.post('/employees', payload)
      if (!res.data?._id) throw new Error('No _id returned')
      employeeId.value = res.data._id
      form.value._id = res.data._id
      Swal.fire({ icon: 'success', title: 'Employee created!' })
      isEditMode.value = false
    } else {
      await axios.put(`/employees/${employeeId.value}`, form.value)
      if (step.value === 1 && isEditMode.value) {
        Swal.fire({ icon: 'success', title: 'Employee updated!' })
      }
    }

    // Step advance or finish
    if (step.value < stepComponents.length) {
      step.value++
    } else {
      Swal.fire({ icon: 'success', title: '✅ All data saved!' })
      localStorage.removeItem('currentStep')
      routerPushList()
    }
  } catch (err) {
    console.error('❌ Save failed:', err)
    Swal.fire({ icon: 'error', title: 'Save failed', text: err.message })
  } finally {
    isSaving.value = false
  }
}

const startNewEmployee = async () => {
  try {
    const hasData = Object.entries(form.value).some(([k, v]) => {
      if (k === '_id') return false
      if (v && typeof v === 'object' && !Array.isArray(v)) return Object.values(v).some(n => n)
      return !!v
    })

    if (hasData && !employeeId.value) {
      const payload = { ...form.value }
      delete payload._id
      const res = await axios.post('/employees', payload)
      if (res.data?._id) Swal.fire({ icon: 'success', title: 'Saved before reset' })
    } else if (employeeId.value) {
      await axios.put(`/employees/${employeeId.value}`, form.value)
      Swal.fire({ icon: 'success', title: 'Updated before reset' })
    }

    resetForm()
    employeeId.value = null
    step.value = 1
    isEditMode.value = false
    localStorage.removeItem('currentStep')

    Swal.fire({ icon: 'success', title: 'Ready for new employee' })
    await nextTick()
  } catch (err) {
    console.error('❌ Reset error:', err)
    Swal.fire({ icon: 'error', title: 'Reset failed', text: err.message })
  }
}

/* ───────────────────────── keyboard shortcuts ───────────────────────── */
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handleStepSubmit()
  }
  if (e.altKey && e.key === 'ArrowRight' && step.value < stepComponents.length) {
    e.preventDefault()
    step.value++
  }
  if (e.altKey && e.key === 'ArrowLeft' && step.value > 1) {
    e.preventDefault()
    step.value--
  }
}
</script>

<style scoped>
/* App bar gradient */
.add-employee-page :deep(.v-toolbar) {
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%);
}

/* Smoke background strip for the stepper */
.stepper-smoke {
  background: #f5f6f8;            /* smoke */
  border: 1px dashed #e6e8ef;
  padding: 6px 8px;
}

/* Compact stepper visuals */
.soft-stepper :deep(.v-stepper-item) { --v-theme-surface: transparent; }
.soft-stepper :deep(.v-stepper-item--selected .v-stepper-item__title) { font-weight: 700; }
.soft-stepper :deep(.v-stepper-header) {
  background: transparent !important; /* header wrapper sits on smoke strip */
  border-radius: 10px;
  padding: 2px 4px;                   /* smaller */
}
/* Make icons/avatars smaller */
.soft-stepper :deep(.v-stepper-item__avatar) {
  height: 26px !important;
  width: 26px !important;
}
.soft-stepper :deep(.v-icon) { font-size: 18px !important; }
.soft-stepper :deep(.v-stepper-item__title) { font-size: 0.9rem; }

/* Full-height content card minus header + action bar */
.full-height-card {
  min-height: calc(100vh - 230px);
}

/* Sticky bottom action bar (compact) */
.action-bar {
  position: sticky;
  bottom: 0;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(6px);
  border-top: 1px solid #e8e8ef;
  border-radius: 12px 12px 0 0;
  padding: 8px 12px;
  margin-top: 10px;
}
.action-bar .shortcut-hint {
  font-size: 11px;
  margin-left: 8px;
  opacity: .7;
}
</style>
