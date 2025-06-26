<template>
  <v-app-bar app flat elevation="2" class="app-bar-shadow">
    <!-- ☰ Menu Button -->
    <v-btn icon @click="$emit('toggle-sidebar')">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <!-- Logo Based on Token-Company -->
    <img
      :src="`/logos/${selectedCompany}.jpg`"
      alt="Company Logo"
      height="36"
      class="ml-2"
    />

    <v-spacer />

    <!-- Company Selector (Optional: GM/Manager only) -->
    <template v-if="role === 'GeneralManager' || role === 'Manager'">
      <v-select
        v-model="dummyCompany"
        :items="companies"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 220px"
        class="mr-4"
        @update:modelValue="alertImmutable"
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
import { ref } from 'vue'
import Swal from 'sweetalert2'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

// Decode token
const token = localStorage.getItem('token')
let decoded = { role: 'Unknown', company: 'Unknown' }

try {
  decoded = JSON.parse(atob(token.split('.')[1]))
} catch (e) {
  console.warn('Invalid token:', e)
}

const role = decoded.role
const selectedCompany = ref(decoded.company)
const companies = ['TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS', 'CAM-TAC']

// Dummy for GM UI (doesn't affect backend)
const dummyCompany = ref(decoded.company)
const alertImmutable = () => {
  Swal.fire({
    icon: 'info',
    title: 'Company switch is display-only',
    text: 'This does not affect backend access.',
    confirmButtonText: 'OK',
    allowEnterKey: true,
  })
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

<style scoped>
.app-bar-shadow {
  position: sticky !important;
  top: 0 !important;
  z-index: 1000;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.v-main {
  background-color: #f4f6f9;
  flex-grow: 1;
  padding-top: 0 !important;
  margin-top: 0 !important;
}
</style>
