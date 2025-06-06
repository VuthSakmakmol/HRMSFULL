<template>
  <v-app-bar
  app
  flat
  elevation="2"
  class="app-bar-shadow"
>

    <!-- ☰ Menu Button -->
    <v-btn icon @click="$emit('toggle-sidebar')">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <!-- Logo -->
    <img
      :src="`/logos/${selectedCompany}.jpg`"
      alt="Company Logo"
      height="36"
      class="ml-2"
    />

    <v-spacer />

    <!-- Company Selector (GM only) -->
    <template v-if="role === 'GeneralManager' || role === 'Manager'">
      <v-select
        v-model="selectedCompany"
        :items="companies"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 220px"
        class="mr-4"
        @update:modelValue="handleCompanyChange"
      />
    </template>

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
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'


const router = useRouter()
const role = localStorage.getItem('role') || 'Unknown'
const companies = ['TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS', 'CAM-TAC']
const selectedCompany = ref(localStorage.getItem('company') || companies[0])

const handleCompanyChange = () => {
  localStorage.setItem('company', selectedCompany.value)
  window.location.reload()
}

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
    allowEnterKey: true
  })

  if (result.isConfirmed) {
    localStorage.clear()
    router.push('/login')
  }
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
