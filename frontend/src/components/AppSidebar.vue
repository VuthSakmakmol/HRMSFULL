<template>
  <v-navigation-drawer
    v-model="drawerInternal"
    :temporary="isMobile"
    :permanent="!isMobile"
    :mini-variant="!isMobile && !drawerInternal"
    app
    class="pa-3"
  >
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-2">
      <span class="text-subtitle-1 font-weight-bold">{{ company }}</span>
      <v-btn icon size="small" @click="drawerInternal = false" v-if="isMobile">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>

    <!-- Navigation -->
    <v-list nav dense>
      <v-list-group>
        <template #activator="{ props }">
          <v-list-item v-bind="props">
            <template #prepend>
              <font-awesome-icon :icon="['fas', 'user-group']" class="sidebar-icon me-2" />
            </template>
            <template #title>TA</template>
          </v-list-item>
        </template>

        <v-list-item :to="{ path: '/ta/dashboard' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'database']" class="sidebar-icon" />
              Dashboard
            </div>
          </template>
        </v-list-item>

        <v-list-item :to="{ path: '/ta/requisitions' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'business-time']" class="sidebar-icon" />
              Job Requisitions
            </div>
          </template>
        </v-list-item>

        <v-list-item :to="{ path: '/ta/candidates' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'user-tie']" class="sidebar-icon" />
              Candidate
            </div>
          </template>
        </v-list-item>

        <v-list-item :to="{ path: '/ta/departments' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'building']" class="sidebar-icon" />
              Department
            </div>
          </template>
        </v-list-item>

        <v-list-item :to="{ path: '/ta/roadmap' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'route']" class="sidebar-icon" />
              Roadmap
            </div>
          </template>
        </v-list-item>
      </v-list-group>

      <!-- HRSS Section -->
      <v-list-group>
        <template #activator="{ props }">
          <v-list-item v-bind="props">
            <template #prepend>
              <font-awesome-icon :icon="['fas', 'clipboard-user']" class="sidebar-icon me-2" />
            </template>
            <template #title>HRSS</template>
          </v-list-item>
        </template>

        <v-list-item :to="{ path: '/hrss/employees' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'users']" class="sidebar-icon" />
              Employee List
            </div>
          </template>
        </v-list-item>

        <v-list-item :to="{ path: '/hrss/attendance' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'clipboard-user']" class="sidebar-icon" />
              Attendance
            </div>
          </template>
        </v-list-item>
        <v-list-item :to="{ path: '/hrss/dashboard/attendance' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'fa-calendar-week']" class="sidebar-icon" />
              Att-Dashboard
            </div>
          </template>
        </v-list-item>
        <v-list-item :to="{ path: '/hrss/manpower/table' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'fa-people-group']" class="sidebar-icon" />
              ManPower
            </div>
          </template>
        </v-list-item>
        <v-list-item :to="{ path: '/hrss/dashboard' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'fa-tachograph-digital']" class="sidebar-icon" />
              Dashboard
            </div>
          </template>
        </v-list-item>
                <v-list-item :to="{ path: '/hrss/dashboard/excome' }">
          <template #title>
            <div class="sidebar-link">
              <font-awesome-icon :icon="['fas', 'fa-database']" class="sidebar-icon" />
              Excome
            </div>
          </template>
        </v-list-item>
      </v-list-group>


      <!-- GM Section -->
      <template v-if="role === 'GeneralManager'">
        <v-list-group>
          <template #activator="{ props }">
            <v-list-item v-bind="props">
              <template #prepend>
                <font-awesome-icon :icon="['fas', 'gear']" class="sidebar-icon me-2" />
              </template>
              <template #title>Manage</template>
            </v-list-item>
          </template>

          <v-list-item :to="{ path: '/gm/users' }">
            <template #title>
              <div class="sidebar-link">
                <font-awesome-icon :icon="['fas', 'users-cog']" class="sidebar-icon" />
                User Management
              </div>
            </template>
          </v-list-item>

          <v-list-item :to="{ path: '/gm/activity-log' }">
            <template #title>
              <div class="sidebar-link">
                <font-awesome-icon :icon="['fas', 'lock']" class="sidebar-icon" />
                Activity Log
              </div>
            </template>
          </v-list-item>
        </v-list-group>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute } from 'vue-router'

const props = defineProps({
  drawer: Boolean,
  role: String,
  company: String,
})
const emit = defineEmits(['update:drawer'])

const drawerInternal = computed({
  get: () => props.drawer,
  set: (val) => emit('update:drawer', val),
})

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const route = useRoute()
watch(route, () => {
  if (isMobile.value) drawerInternal.value = false
})
</script>

<style scoped>
.v-navigation-drawer {
  background-color: #e9f8f8;
  border-right: 1px solid #a6a5a5;
  color: #212121;
  max-width: 260px;
  overflow-y: auto;
}

.v-list-item {
  padding-top: 4px;
  padding-bottom: 4px;
}

.sidebar-icon {
  font-size: 17px;
  width: 20px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
