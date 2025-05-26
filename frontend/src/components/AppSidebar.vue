<template>
  <v-navigation-drawer permanent class="pa-3">
    <v-list nav dense>

      <!-- 🔹 Company Name -->
      <v-list-subheader class="text-uppercase font-weight-bold">
        {{ company }}
      </v-list-subheader>

      <!-- 🔹 General Manager Dropdown -->
      <template v-if="role === 'GeneralManager'">
        <v-list-group value="Manage">
          <template #activator="{ props }">
            <v-list-item v-bind="props" title="Manage" prepend-icon="mdi-cog" />
          </template>

          <v-list-item
            :to="{ path: '/users' }"
            title="User Management"
            prepend-icon="mdi-account-group-outline"
          />
          <v-list-item
            title="Permissions"
            prepend-icon="mdi-shield-key-outline"
            disabled
          />
        </v-list-group>
      </template>

      <!-- 🔹 TA Menu with Bullet-style Subitems -->
      <v-list-group value="TA">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-briefcase-outline" title="TA" />
        </template>

        <v-list-item :to="{ path: '/dashboard' }" class="pl-4">
          <template #prepend>
            <v-icon size="14" class="text-grey-darken-1">mdi-circle-small</v-icon>
          </template>
          <template #title>Dashboard</template>
        </v-list-item>

        <v-list-item :to="{ path: '/requisitions' }" class="pl-4">
          <template #prepend>
            <v-icon size="14" class="text-grey-darken-1">mdi-circle-small</v-icon>
          </template>
          <template #title>Job Requisition</template>
        </v-list-item>

        <v-list-item :to="{ path: '/candidates' }" class="pl-4">
          <template #prepend>
            <v-icon size="14" class="text-grey-darken-1">mdi-circle-small</v-icon>
          </template>
          <template #title>Candidate</template>
        </v-list-item>
      </v-list-group>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
const role = localStorage.getItem('role') || 'Unknown'
const company = localStorage.getItem('company') || 'No Company'
</script>

<style scoped>
.v-navigation-drawer {
  background-color: #f9fafa;
  border-right: 1px solid #ddd;
  color: #212121; /* ✅ Make text dark */
}

.v-list-item-title {
  color: #212121 !important; /* ✅ Force all text to dark */
}

.v-list-subheader {
  color: #555 !important; /* ✅ Subheader visibility */
}

.v-icon {
  color: #555 !important; /* ✅ Bullet and icons */
}
</style>

