<template>
  <v-card class="pa-6 text-center">
    <h4 class="text-h6 font-weight-bold">Total Employees</h4>
    <div class="text-h4 mt-2">{{ total }}</div>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

const total = ref(0)

onMounted(async () => {
  try {
    const res = await axios.get('/hrss/employees')
    if (Array.isArray(res.data)) total.value = res.data.length
    else console.warn('Unexpected response format:', res.data)
  } catch (err) {
    console.error('❌ Failed to load employees:', err.message)
  }
})
</script>
