<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h6 font-weight-bold mb-4">🢍 Employee Registration</h2>

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

    <!-- Step Component -->
    <component
      :is="stepComponents[step - 1]"
      v-model:form="form"
      :isEditMode="isEditMode"
      @submitEdit="handleStepSubmit"
      @cancelEdit="router.push('/hrss/employees')"
    />

    <!-- Navigation Buttons -->
    <v-row justify="space-between" class="mt-4" v-if="!isEditMode || step !== 1">
      <v-btn :disabled="step === 1" @click="step--" variant="outlined">Back</v-btn>
      <v-btn color="green" class="mb-4" @click="startNewEmployee">➕ New Employee</v-btn>
      <v-btn color="primary" @click="handleStepSubmit">
        {{ step === stepComponents.length ? 'Finish' : 'Next' }}
      </v-btn>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Swal from 'sweetalert2'
import axios from '@/utils/axios'

// Step components
import Step1 from '@/hrsscomponents/EmployeeSteps/Step1.vue'
import Step2 from '@/hrsscomponents/EmployeeSteps/Step2.vue'
import Step3 from '@/hrsscomponents/EmployeeSteps/Step3.vue'
import Step4 from '@/hrsscomponents/EmployeeSteps/Step4.vue'
import Step5 from '@/hrsscomponents/EmployeeSteps/Step5.vue'

const router = useRouter()
const route = useRoute()

const step = ref(parseInt(localStorage.getItem('currentStep') || '1'))
const stepComponents = [Step1, Step2, Step3, Step4, Step5]
const employeeId = ref(route.query.id || null)
const isEditMode = ref(false)

const form = ref({
  profileImage: '', profileImageFile: null,
  employeeId: '', khmerFirstName: '', khmerLastName: '',
  englishFirstName: '', englishLastName: '', gender: '', dob: '', age: null,
  idCard: '', idCardExpireDate: '', nssf: '', joinDate: '',
  department: '', position: '', agentPhoneNumber: '',
  marriedStatus: '', agentPerson: '', spouseName: '', spouseContactNumber: '',
  line: '', team: '', section: '', education: '',
  religion: '', nationality: '', status: '', shift: '',
  sourceOfHiring: '', introducerId: '', employeeType: '',
  singleNeedle: '', overlock: '', coverstitch: '', totalMachine: null,
  workingBook: '', medicalCheck: '', medicalCheckDate: '',
  passport: '', passportExpireDate: '', visaExpireDate: '',
  remark: '', email: '', phoneNumber: '',
  placeOfBirth: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
  placeOfLiving: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
  company: localStorage.getItem('company')
})

const totalFields = 48
const completionPercentage = computed(() => {
  const flat = Object.values(form.value).flatMap(v =>
    typeof v === 'object' && v !== null ? Object.values(v) : [v]
  )
  const filled = flat.filter(v => v !== '' && v !== null && v !== undefined)
  return Math.min(Math.round((filled.length / totalFields) * 100), 100)
})

watch(step, newStep => localStorage.setItem('currentStep', newStep))

// 🔃 Handle Image Upload Before Save
const handleProfileImageUpload = async () => {
  const file = form.value.profileImageFile
  if (!file) return

  try {
    const formData = new FormData()
    formData.append('image', file)
    const res = await axios.post('/upload/profile-image', formData)
    form.value.profileImage = res.data.imageUrl
  } catch (err) {
    console.error('❌ Upload failed:', err)
    Swal.fire({ icon: 'error', title: 'Upload failed', text: err.message })
  }
}

// 📥 Load if Edit Mode
onMounted(async () => {
  if (employeeId.value) {
    try {
      const res = await axios.get(`/employees/${employeeId.value}`)
      form.value = { ...form.value, ...res.data }
      isEditMode.value = true
      step.value = 1
    } catch (err) {
      console.error('❌ Failed to load employee:', err)
    }
  }
})

// 💾 Step Handler
const handleStepSubmit = async () => {
  try {
    await handleProfileImageUpload()

    if (!employeeId.value) {
      const res = await axios.post('/employees', form.value)
      if (!res.data?._id) throw new Error('No _id returned')
      employeeId.value = res.data._id
      form.value._id = res.data._id
      Swal.fire({ icon: 'success', title: 'Employee created!' })
      router.replace({ path: '/hrss/addemployee', query: { id: employeeId.value } })
    } else {
      await axios.put(`/employees/${employeeId.value}`, form.value)
      if (step.value === 1 && isEditMode.value) {
        Swal.fire({ icon: 'success', title: 'Employee updated!' })
      }
    }

    if (step.value < stepComponents.length) {
      step.value++
    } else {
      Swal.fire({ icon: 'success', title: '🎉 All data saved!' }).then(() => {
        localStorage.removeItem('currentStep')
        router.push('/hrss/employees')
      })
    }
  } catch (err) {
    console.error('❌ Save failed:', err)
    Swal.fire({ icon: 'error', title: 'Failed to save', text: err.message })
  }
}

// 🆕 Reset to New
const startNewEmployee = async () => {
  try {
    const hasData = Object.values(form.value).some(v =>
      typeof v === 'object' ? Object.values(v).some(n => n) : v
    )

    if (hasData && !employeeId.value) {
      const res = await axios.post('/employees', form.value)
      if (res.data?._id) {
        Swal.fire({ icon: 'success', title: 'Saved current before new' })
      }
    } else if (employeeId.value) {
      await axios.put(`/employees/${employeeId.value}`, form.value)
      Swal.fire({ icon: 'success', title: 'Updated before reset' })
    }

    Object.assign(form.value, {
      profileImage: '', profileImageFile: null,
      employeeId: '', khmerFirstName: '', khmerLastName: '',
      englishFirstName: '', englishLastName: '', gender: '', dob: '', age: null,
      idCard: '', idCardExpireDate: '', nssf: '', joinDate: '',
      department: '', position: '', agentPhoneNumber: '',
      marriedStatus: '', agentPerson: '', spouseName: '', spouseContactNumber: '',
      line: '', team: '', section: '', education: '',
      religion: '', nationality: '', status: '', shift: '',
      sourceOfHiring: '', introducerId: '', employeeType: '',
      singleNeedle: '', overlock: '', coverstitch: '', totalMachine: null,
      workingBook: '', medicalCheck: '', medicalCheckDate: '',
      passport: '', passportExpireDate: '', visaExpireDate: '',
      remark: '', email: '', phoneNumber: '',
      placeOfBirth: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
      placeOfLiving: { provinceNameKh: '', districtNameKh: '', communeNameKh: '', villageNameKh: '' },
      company: localStorage.getItem('company')
    })

    employeeId.value = null
    step.value = 1
    isEditMode.value = false
    localStorage.removeItem('currentStep')
    router.replace({ path: '/hrss/addemployee' })
  } catch (err) {
    console.error('❌ Reset error:', err)
    Swal.fire({ icon: 'error', title: 'Reset failed', text: err.message })
  }
}
</script>
