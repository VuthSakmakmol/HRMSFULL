<template>
  <v-app>
    <AppTopbar @toggle-sidebar="toggleSidebar" />

    <AppSidebar
      v-model:drawer="drawer"
      :role="role"
      :company="company"
    />

    <v-main>
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import AppTopbar from '@/components/AppTopbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { ref } from 'vue'

const drawer = ref(false)
const role = localStorage.getItem('role') || 'Unknown'
const company = localStorage.getItem('company') || 'No Company'

const toggleSidebar = () => {
  drawer.value = !drawer.value
}
</script>


<style scoped>
/* Optional scroll if sidebar fixed */
.v-main {
  background-color: #f4f6f9;
  min-height: 100vh;
}
</style>
