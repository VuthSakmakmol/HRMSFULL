<template>
  <v-container>
    <h2 class="text-h6 font-weight-bold mb-4">👤 Candidates - {{ company }}</h2>

    <v-list v-if="candidates.length">
      <v-list-item
        v-for="c in candidates"
        :key="c._id"
        :title="c.fullName"
        :subtitle="c.jobTitle + ' – ' + c.progress"
      />
    </v-list>

    <v-alert v-else type="info" border="start" variant="outlined">
      No candidates for {{ company }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

const company = localStorage.getItem('company')
const candidates = ref([])

const loadCandidates = async () => {
  try {
    const res = await axios.get('/ta/candidates', {
      params: { company }
    })
    candidates.value = res.data
  } catch (err) {
    candidates.value = []
    console.error('Failed to load candidates:', err)
  }
}

onMounted(loadCandidates)
</script>
