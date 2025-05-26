<template>
  <v-app-bar flat color="white" elevation="1">
    <v-toolbar-title class="font-weight-bold">🔐 HRMS System</v-toolbar-title>
    <v-spacer />

    <!-- Role display -->
    <v-chip class="mr-3" color="primary" variant="flat" size="small">
      {{ role }}
    </v-chip>

    <!-- Logout -->
    <v-btn icon @click="logout" title="Logout">
      <v-icon color="red">mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const role = localStorage.getItem('role') || 'Unknown'

const logout = () => {
  localStorage.clear()
  router.push('/login')
}
</script>
