<template>
  <v-app>
    <!-- Topbar -->
    <AppTopbar />

    <v-main>
      <v-container fluid class="d-flex pa-0">
        <!-- Sidebar -->
        <AppSidebar class="sidebar" />

        <!-- Page content -->
        <div class="flex-grow-1 pa-4">
          <router-view />
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import AppTopbar from '@/components/AppTopbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background-color: #f8f9fa;
  border-right: 1px solid #ddd;
}
</style>
