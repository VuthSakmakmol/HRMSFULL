<template>
  <v-row dense>
    <v-col cols="12" sm="6">
      <v-card>
        <v-card-title>Avg Age (All Employees)</v-card-title>
        <v-card-text class="display-1">
          {{ ages.total }} yrs
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6">
      <v-card>
        <v-card-title>Avg Age (Sewer)</v-card-title>
        <v-card-text class="display-1">
          {{ ages.sewer }} yrs
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

interface AgeResponse {
  total: number
  sewer: number
}

const ages = ref<AgeResponse>({ total: 0, sewer: 0 })

onMounted(async () => {
  try {
    const { data } = await axios.get('/hrss/excome/employee-age')
    ages.value = {
      total: data.total,
      sewer: data.sewer
    }
  } catch (err) {
    console.error('Failed to load average ages:', err)
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
