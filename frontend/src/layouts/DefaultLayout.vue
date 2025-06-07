<template>
  <v-app>
    <AppTopbar @toggle-sidebar="toggleSidebar" />

    <v-layout class="main-layout">
      <!-- Sidebar -->
      <AppSidebar
        v-model:drawer="drawer"
        :role="role"
        :company="company"
        class="sidebar-fixed"
      />

      <!-- Main Content Area -->
      <v-main class="main-content">
        <v-container fluid class="pa-0 ma-0">
          <router-view />
        </v-container>
      </v-main>
    </v-layout>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import AppTopbar from '@/components/AppTopbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'

const drawer = ref(true)
const role = localStorage.getItem('role') || 'Unknown'
const company = localStorage.getItem('company') || 'No Company'

const toggleSidebar = () => {
  drawer.value = !drawer.value
}
</script>

<style scoped>
html, body, .v-application {
  margin: 0;
  padding: 0;
  height: 100%;
}

.main-layout {
  height: 100vh;
  overflow: hidden;
}

.sidebar-fixed {
  height: 100vh;
  overflow-y: auto;
  border-right: 1px solid #ccc;
  background-color: #e9f8f8;
  max-width: 260px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: #f4f6f9;
  padding-top: 0 !important;
  margin-top: 0 !important;
}
</style>
