<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">🚍 Employee Registration</h2>

    <!-- Progress Bar -->
    <v-progress-linear
      :model-value="completionPercentage"
      color="primary"
      height="18"
      class="mb-4"
      striped
      rounded
    >
      <strong>{{ completionPercentage }}%</strong>
    </v-progress-linear>

    <v-btn
      color="secondary"
      class="mb-4"
      variant="outlined"
      @click="router.push('/hrss/employees')"
    >
      <v-icon start>mdi-arrow-left</v-icon>
      Back to Employee List
    </v-btn>

    <!-- Dynamic Step -->
    <component
      :is="stepComponents[step - 1]"
      ref="stepComponent"
      v-model:form="form"
      :isEditMode="isEditMode"
      :step="step"
      @submitEdit="handleStepSubmit"
      @cancelEdit="router.push('/hrss/employees')"
    />

    <!-- Navigation -->
    <v-row justify="space-between" class="mt-4" v-if="!isEditMode || step !== 1">
      <v-btn :disabled="step === 1" @click="step--" variant="outlined">Back</v-btn>
      <v-btn color="green" class="mb-4" @click="startNewEmployee">+ New Employee</v-btn>
      <v-btn color="primary" @click="handleStepSubmit">
        {{ step === stepComponents.length ? 'Finish' : 'Next' }}
      </v-btn>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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
const stepComponent = ref(null)

const router = useRouter()
const route = useRoute()

const employeeId = ref(route.query.id || null)
const isEditMode = ref(false)

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

/* ───────────────────────── progress ─────────────────────────
   We count all primitive fields + nested address primitives.
   Adjust "TOTAL_FIELDS" if you add/remove inputs.
---------------------------------------------------------------- */
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
const loadEmployee = async (id) => {
  if (!id) return
  try {
    const res = await axios.get(`/employees/${id}`)
    // keep defaults like company if missing
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
})

// React if user navigates with another ?id
watch(
  () => route.query.id,
  async (id) => {
    employeeId.value = id || null
    if (employeeId.value) await loadEmployee(employeeId.value)
    else {
      // switched to create
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
      // keep create flow (not forcing edit mode)
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
      router.push('/hrss/employees')
    }
  } catch (err) {
    console.error('❌ Save failed:', err)
    Swal.fire({ icon: 'error', title: 'Save failed', text: err.message })
  }
}

const startNewEmployee = async () => {
  try {
    // Does the form contain any data?
    const hasData = Object.entries(form.value).some(([k, v]) => {
      if (k === '_id') return false
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return Object.values(v).some(n => n)
      }
      return !!v
    })

    if (hasData && !employeeId.value) {
      // Save current as a new record before reset
      const payload = { ...form.value }
      delete payload._id
      const res = await axios.post('/employees', payload)
      if (res.data?._id) Swal.fire({ icon: 'success', title: 'Saved before reset' })
    } else if (employeeId.value) {
      // Update current record before reset
      await axios.put(`/employees/${employeeId.value}`, form.value)
      Swal.fire({ icon: 'success', title: 'Updated before reset' })
    }

    // Now reset for a fresh record
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
</script>
