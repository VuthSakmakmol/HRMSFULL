<template>
  <v-app-bar flat color="white" elevation="2" class="app-bar-shadow">
    <!-- ☰ Menu Button -->
    <v-btn icon @click="$emit('toggle-sidebar')">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <!-- App Title -->
    <v-toolbar-title class="font-weight-bold text-primary">
      System
    </v-toolbar-title>

    <v-spacer />

    <!-- Company Selector (GM only) -->
    <template v-if="role === 'GeneralManager'">
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

const router = useRouter()
const role = localStorage.getItem('role') || 'Unknown'
const companies = ['TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS', 'CAM-TAC']
const selectedCompany = ref(localStorage.getItem('company') || companies[0])

const handleCompanyChange = () => {
  localStorage.setItem('company', selectedCompany.value)
  window.location.reload()
}

const logout = () => {
  localStorage.clear()
  router.push('/login')
}
</script>

<style scoped>
.app-bar-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background-color: #ffffff;
  z-index: 10;
}
</style>
