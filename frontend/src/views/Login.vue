<template>
  <v-container class="d-flex justify-center align-center fill-height">
    <v-card width="400" class="pa-6">
      <v-card-title class="text-center text-h6 font-weight-bold">🔐 HRMS Login</v-card-title>

      <v-form @submit.prevent="login">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          prepend-inner-icon="mdi-email"
          required
        />
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          prepend-inner-icon="mdi-lock"
          required
        />
        <v-btn type="submit" block color="primary" class="mt-4">Login</v-btn>
      </v-form>

      <v-alert
        v-if="error"
        type="error"
        class="mt-4"
        dense
        border="start"
      >
        {{ error }}
      </v-alert>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import axios from '@/utils/axios' // ✅ Correct alias path
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

const login = async () => {
  try {
    const res = await axios.post('/auth/login', {
      email: email.value,
      password: password.value
    })

    const { token, user } = res.data

    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user)) // ✅ This fixes the GM issue
    localStorage.setItem('role', user.role)
    localStorage.setItem('name', user.name)
    localStorage.setItem('company', user.company || '')

    if (user.role === 'GeneralManager') {
      router.push('/gm/dashboard')
    } else {
      router.push('/ta/dashboard')
    }

  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed'
  }
}

</script>
