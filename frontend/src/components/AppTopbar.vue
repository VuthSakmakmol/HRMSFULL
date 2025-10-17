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
    <v-chip color="primary" variant="flat" class="mr-2">{{ role }}</v-chip>

    <!-- Logout Button -->
    <v-btn icon @click="logout" color="error">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup>
import { ref, watch } from 'vue'
import Swal from 'sweetalert2'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

// Decode token
const token = localStorage.getItem('token')
let decoded = { role: 'Unknown', company: 'Unknown' }
try {
  decoded = JSON.parse(atob((token || '').split('.')[1] || ''))
} catch (e) {
  console.warn('Invalid token:', e)
}

const role = decoded.role
const companies = ['TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS', 'CAM-TAC']

// ✅ Normalize initial company:
// 1) use localStorage if present
// 2) if token has array (GM), take first
// 3) if token has string, use it
// 4) default to 'CAM-TAC'
const initialCompany =
  localStorage.getItem('company') ||
  (Array.isArray(decoded.company) ? (decoded.company[0] || 'CAM-TAC') : (decoded.company || 'CAM-TAC'))

const selectedCompany = ref(initialCompany)

// Watch changes to update localStorage and show success alert
watch(selectedCompany, (newCompany, oldCompany) => {
  if (newCompany === oldCompany) return
  localStorage.setItem('company', newCompany)
  Swal.fire({
    icon: 'success',
    title: `Company switched to ${newCompany}`,
    text: 'Your API requests will use this company.',
    confirmButtonText: 'OK',
    allowEnterKey: true,
  })
})

// Handle logo fallback if missing image
const setDefaultLogo = (e) => {
  e.target.src = '/default_images/default-logo.jpg' // fallback logo path
}

// Logout
const router = useRouter()
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
    allowEnterKey: true,
  })

  if (result.isConfirmed) {
    localStorage.clear()
    router.push('/login')
  }
}

// i18n Language Support
const { locale } = useI18n()
const selectedLanguage = ref(localStorage.getItem('lang') || 'en')
const languages = [
  { title: 'English', value: 'en' },
  { title: 'Thai', value: 'th' },
  { title: 'Khmer', value: 'kh' },
]

const changeLanguage = (lang) => {
  locale.value = lang
  localStorage.setItem('lang', lang)
}
</script>
