<template>
  <v-app>
    <AppTopbar @toggle-sidebar="toggleSidebar" @company-changed="onCompanyChanged" />

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
          <router-view v-slot="{ Component }">
            <keep-alive include="EmployeeList">
              <component :is="Component" :key="$route.fullPath" />
            </keep-alive>
          </router-view>
        </v-container>
      </v-main>
    </v-layout>
  </v-app>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue'
import AppTopbar from '@/components/AppTopbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'

const drawer = ref(false)
const role = localStorage.getItem('role') || 'Unknown'
const company = localStorage.getItem('company') || 'No Company'

const toggleSidebar = () => {
  drawer.value = !drawer.value
}

// ✅ Listen for company change event from AppTopbar and reload data on active page:
const { proxy } = getCurrentInstance()

const onCompanyChanged = () => {
  const currentPage = proxy.$route.matched[0]?.instances.default
  if (currentPage?.fetchEmployees) {
    currentPage.fetchEmployees()
  }
}

</script>

<style scoped>
html, body, .v-application {
  margin: 0;
  padding: 0;
  height: 100%;
}

.main-layout {
  height: 91vh;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content > .v-container {
  flex: 1;
  overflow-y: auto;
}

.sidebar-fixed {
  height: 100vh;
  overflow-y: auto;
  border-right: 1px solid #ccc;
  background-color: #e9f8f8;
  max-width: 260px;
}
</style>
