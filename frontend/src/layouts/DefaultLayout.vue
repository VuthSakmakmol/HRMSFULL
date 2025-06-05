<template>
  <v-app>
    <div class="layout-wrapper">
      <!-- Sidebar: Fixed, scrollable -->
      <AppSidebar
        v-model:drawer="drawer"
        :role="role"
        :company="company"
        class="sidebar-fixed"
      />

      <!-- Content: Scrollable independently -->
      <div class="main-scrollable">
        <AppTopbar @toggle-sidebar="toggleSidebar" />

        <v-main>
          <v-container fluid class="pa-4">
            <router-view />
          </v-container>
        </v-main>
      </div>
    </div>
  </v-app>
</template>

<script setup>
import AppTopbar from '@/components/AppTopbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { ref } from 'vue'

const drawer = ref(true)
const role = localStorage.getItem('role') || 'Unknown'
const company = localStorage.getItem('company') || 'No Company'

const toggleSidebar = () => {
  drawer.value = !drawer.value
}
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar-fixed {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 2;
}

.main-scrollable {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.v-main {
  background-color: #f4f6f9;
  flex-grow: 1;
}
</style>
