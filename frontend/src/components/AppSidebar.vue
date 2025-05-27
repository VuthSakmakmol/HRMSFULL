<template>
  <v-navigation-drawer
    v-model="drawerInternal"
    :temporary="isMobile"
    :permanent="!isMobile"
    app
    class="pa-3"
  >
    <!-- Header with Company & Close -->
    <div class="d-flex justify-space-between align-center mb-2">
      <span class="text-subtitle-1 font-weight-bold">{{ company }}</span>
      <v-btn icon size="small" @click="drawerInternal = false" v-if="isMobile">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>

    <v-list nav dense>

      <!-- 🔹 General Manager Section -->
      <template v-if="role === 'GeneralManager'">
        <v-list-group value="Manage">
          <template #activator="{ props }">
            <v-list-item v-bind="props" title="Manage" prepend-icon="mdi-cog" />
          </template>

          <v-list-item
            :to="{ path: '/gm/users' }"
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

      <!-- 🔹 TA Section -->
      <v-list-group value="TA">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-briefcase-outline" title="TA" />
        </template>

        <v-list-item :to="{ path: '/ta/dashboard' }">
          <template #prepend>
            <v-icon size="14" class="text-grey-darken-1">mdi-circle-small</v-icon>
          </template>
          <template #title>Dashboard</template>
        </v-list-item>

        <v-list-item :to="{ path: '/ta/requisitions' }">
          <template #prepend>
            <v-icon size="14" class="text-grey-darken-1">mdi-circle-small</v-icon>
          </template>
          <template #title>Job Requisition</template>
        </v-list-item>

        <v-list-item :to="{ path: '/ta/candidates' }">
          <template #prepend>
            <v-icon size="14" class="text-grey-darken-1">mdi-circle-small</v-icon>
          </template>
          <template #title>Candidate</template>
        </v-list-item>

        <v-list-item :to="{ path: '/ta/departments' }">
          <template #prepend>
            <v-icon size="14" class="text-grey-darken-1">mdi-circle-small</v-icon>
          </template>
          <template #title>Data Entry</template>
        </v-list-item>
      </v-list-group>

    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

// Props from layout
const props = defineProps({
  drawer: Boolean,
  role: String,
  company: String
})

const emit = defineEmits(['update:drawer'])

const drawerInternal = computed({
  get: () => props.drawer,
  set: (val) => emit('update:drawer', val)
})

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
</script>

<style scoped>
.v-navigation-drawer {
  background-color: #f9fafa;
  border-right: 1px solid #ddd;
  color: #212121;
  max-width: 260px;
}

.v-list-subheader,
.v-list-item-title,
.v-icon {
  color: #555 !important;
}
</style>
