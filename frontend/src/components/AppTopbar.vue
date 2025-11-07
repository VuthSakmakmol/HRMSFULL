<template>
  <v-app-bar app flat elevation="2" class="app-bar-shadow">
    <!-- ☰ Menu Button -->
    <v-btn icon @click="$emit('toggle-sidebar')">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <!-- Dynamic Company Logo -->
    <img
      :src="`/logos/${selectedCompany}.jpg`"
      alt="Company Logo"
      height="36"
      class="ml-2"
      @error="setDefaultLogo"
    />

    <v-spacer />

    <!-- Company Selector (GM/Manager only) -->
    <template v-if="role === 'GeneralManager' || role === 'Manager'">
      <v-select
        v-model="selectedCompany"
        :items="companies"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 220px"
        class="mr-4"
      />
    </template>

    <!-- Language Selector -->
    <v-select
      v-model="selectedLanguage"
      :items="languages"
      density="compact"
      variant="outlined"
      hide-details
      style="max-width: 120px"
      class="mr-2"
      @update:modelValue="changeLanguage"
    />

    <!-- Role Display -->
    <!-- <v-chip color="primary" variant="flat" class="mr-2">
      {{ role || 'Guest' }}
    </v-chip> -->

    <!-- Logout Button -->
    <v-btn icon @click="logout" color="error">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import Swal from 'sweetalert2'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { locale } = useI18n()

// 🧠 Refs
const role = ref('Guest')
const selectedCompany = ref('CAM-TAC')
const companies = ['TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS', 'CAM-TAC']
const selectedLanguage = ref(localStorage.getItem('lang') || 'en')
const languages = [
  { title: 'English', value: 'en' },
  { title: 'Thai', value: 'th' },
  { title: 'Khmer', value: 'kh' },
]

// ✅ Read token safely when mounted
const loadUserFromStorage = () => {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const decoded = JSON.parse(atob(token.split('.')[1]))
    role.value = decoded.role || 'Unknown'

    // Determine company priority
    const savedCompany = localStorage.getItem('company')
    const decodedCompany = Array.isArray(decoded.company)
      ? decoded.company[0]
      : decoded.company

    selectedCompany.value = savedCompany || decodedCompany || 'CAM-TAC'
    localStorage.setItem('company', selectedCompany.value)
  } catch (e) {
    console.warn('Invalid token, skipping decode')
  }
}

// Load immediately after mount
onMounted(loadUserFromStorage)

// Watch changes to update company
watch(selectedCompany, (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return
  localStorage.setItem('company', newVal)
  Swal.fire({
    icon: 'success',
    title: `Company switched to ${newVal}`,
    text: 'Your API requests will use this company.',
    confirmButtonText: 'OK',
  })
})

// Handle missing logo
const setDefaultLogo = (e) => {
  e.target.src = '/default_images/default-logo.jpg'
}

// Logout
const logout = async () => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'You will be logged out from the system.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, logout',
    cancelButtonText: 'Cancel',
  })

  if (result.isConfirmed) {
    localStorage.clear()
    router.push('/login')
  }
}

// Language change
const changeLanguage = (lang) => {
  locale.value = lang
  localStorage.setItem('lang', lang)
}
</script>
