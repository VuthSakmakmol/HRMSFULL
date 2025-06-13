<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">🧍 Employee Registration</h2>

    <!-- ✅ Progress Bar -->
    <v-progress-linear
      :model-value="completionPercentage"
      color="primary"
      height="18"
      class="mb-4"
      striped
      rounded
      :indeterminate="false"
    >
      <strong>{{ completionPercentage }}%</strong>
    </v-progress-linear>

    <!-- ✅ Dynamic Step Form -->
    <component :is="stepComponents[step - 1]" v-model:form="form" />

    <!-- ✅ Navigation Buttons -->
    <v-row justify="space-between" class="mt-4">
      <v-btn :disabled="step === 1" @click="step--" variant="outlined">Back</v-btn>
      <v-btn color="green" class="mb-4" @click="startNewEmployee">
        ➕ New Employee
      </v-btn>

      <v-btn color="primary" @click="handleStepSubmit">
        {{ step === stepComponents.length ? 'Finish' : 'Next' }}
      </v-btn>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '@/utils/axios'
import Swal from 'sweetalert2'

// Step components
import Step1 from '@/hrsscomponents/EmployeeSteps/Step1.vue'
import Step2 from '@/hrsscomponents/EmployeeSteps/Step2.vue'
import Step3 from '@/hrsscomponents/EmployeeSteps/Step3.vue'
import Step4 from '@/hrsscomponents/EmployeeSteps/Step4.vue'
import Step5 from '@/hrsscomponents/EmployeeSteps/Step5.vue'

const router = useRouter()
const route = useRoute()
const employeeId = ref(route.query.id || null)
const step = ref(parseInt(localStorage.getItem('currentStep') || '1'))

const stepComponents = [Step1, Step2, Step3, Step4, Step5]

const form = ref({
  employeeId: '',
  khmerFirstName: '',
  khmerLastName: '',
  englishFirstName: '',
  englishLastName: '',
  gender: '',
  dob: '',
  age: null,
  idCard: '',
  idCardExpireDate: '',
  nssf: '',
  joinDate: '',
  department: '',
  position: '',
  agentPhoneNumber: '',
  marriedStatus: '',
  agentPerson: '',
  spouseName: '',
  spouseContactNumber: '',
  line: '', team: '', section: '',
  education: '', religion: '', nationality: '',
  status: '', shift: '',
  sourceOfHiring: '', introducerId: '', employeeType: '',
  singleNeedle: '', overlock: '', coverstitch: '', totalMachine: null,
  workingBook: '', medicalCheck: '', medicalCheckDate: '',
  passport: '', passportExpireDate: '', visaExpireDate: '',
  remark: '', email: '', phoneNumber: '',
  placeOfBirth: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
  placeOfLiving: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
  company: localStorage.getItem('company') || 'CAM-TAC'
})

const totalFields = 48
const completionPercentage = computed(() => {
  const flat = Object.values(form.value).flatMap(v =>
    typeof v === 'object' && v !== null ? Object.values(v) : [v]
  )
  const filled = flat.filter(v => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / totalFields) * 100), 100)
})

// ✅ Store step in localStorage
watch(step, (newStep) => {
  localStorage.setItem('currentStep', newStep)
})

const handleStepSubmit = async () => {
  try {
    if (!employeeId.value) {
      // Step 1 (Create new employee)
      const res = await axios.post('/employees', form.value)

      if (!res.data || !res.data._id) {
        throw new Error('No _id returned from server')
      }

      employeeId.value = res.data._id

      Swal.fire({ icon: 'success', title: 'Employee created!' })
      router.replace({ path: '/hrss/addemployee', query: { id: employeeId.value } })
    } else {
      // Step 2+ (Update existing employee)
      await axios.put(`/employees/${employeeId.value}`, form.value)
    }

    // ✅ Move to next step only after save
    if (step.value < stepComponents.length) {
      step.value++
    } else {
      Swal.fire({
        icon: 'success',
        title: '🎉 All data saved!',
        confirmButtonText: 'OK',
        allowEnterKey: true
      }).then(() => {
        localStorage.removeItem('currentStep')
        router.push('/hrss/employees')
      })
    }

  } catch (err) {
    console.error('❌ Save failed:', err)
    Swal.fire({ icon: 'error', title: 'Failed to save', text: err.message })
  }
}

// ✅ Reset form
const startNewEmployee = async () => {
  try {
    // ✅ Only save if form has meaningful values (not empty form)
    const hasData = Object.values(form.value).some(v =>
      typeof v === 'object'
        ? Object.values(v).some(n => n) // nested object (placeOfBirth etc.)
        : v
    )

    if (hasData && !employeeId.value) {
      // Save as new employee before reset
      const res = await axios.post('/employees', form.value)
      if (res.data?._id) {
        Swal.fire({
          icon: 'success',
          title: 'Current employee saved before starting new',
          confirmButtonText: 'OK'
        })
      }
    } else if (employeeId.value) {
      // Existing employee, update first
      await axios.put(`/employees/${employeeId.value}`, form.value)
      Swal.fire({
        icon: 'success',
        title: 'Existing employee updated before starting new',
        confirmButtonText: 'OK'
      })
    }

    // ✅ Now reset form and state
    Object.assign(form.value, {
      employeeId: '',
      khmerFirstName: '',
      khmerLastName: '',
      englishFirstName: '',
      englishLastName: '',
      gender: '',
      dob: '',
      age: null,
      idCard: '',
      idCardExpireDate: '',
      nssf: '',
      joinDate: '',
      department: '',
      position: '',
      agentPhoneNumber: '',
      marriedStatus: '',
      agentPerson: '',
      spouseName: '',
      spouseContactNumber: '',
      line: '', team: '', section: '',
      education: '', religion: '', nationality: '',
      status: '', shift: '',
      sourceOfHiring: '', introducerId: '', employeeType: '',
      singleNeedle: '', overlock: '', coverstitch: '', totalMachine: null,
      workingBook: '', medicalCheck: '', medicalCheckDate: '',
      passport: '', passportExpireDate: '', visaExpireDate: '',
      remark: '', email: '', phoneNumber: '',
      placeOfBirth: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
      placeOfLiving: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
      company: localStorage.getItem('company') || 'CAM-TAC'
    })
    employeeId.value = null
    step.value = 1
    localStorage.removeItem('currentStep')

    router.replace({ path: '/hrss/addemployee' })
  } catch (err) {
    console.error('❌ Failed to save before resetting:', err)
    Swal.fire({ icon: 'error', title: 'Save failed', text: err.message })
  }
}


// ✅ Auto-load existing data
onMounted(async () => {
  if (employeeId.value) {
    try {
      const res = await axios.get(`/employees/${employeeId.value}`)
      form.value = { ...form.value, ...res.data }
    } catch (err) {
      console.error('❌ Failed to load employee:', err)
    }
  }
})
</script>


