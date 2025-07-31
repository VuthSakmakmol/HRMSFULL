<template>
  <v-row dense>
    <v-col cols="12" sm="6">
      <v-card>
        <v-card-title>Avg Service (All Working)</v-card-title>
        <v-card-text class="display-1">
          {{ services.total }} yrs
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6">
      <v-card>
        <v-card-title>Avg Service (Sewer)</v-card-title>
        <v-card-text class="display-1">
          {{ services.sewer }} yrs
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

interface ServiceResponse {
  total: number
  sewer: number
}

const services = ref<ServiceResponse>({ total: 0, sewer: 0 })

onMounted(async () => {
  try {
    const { data } = await axios.get<ServiceResponse>('/hrss/excome/employee-service')
    services.value = { total: data.total, sewer: data.sewer }
  } catch (err) {
    console.error('Failed to load average service years:', err)
  }
})
</script>

<style scoped>
.display-1 {
  font-size: 3rem;
  font-weight: 500;
  text-align: center;
}
</style>
