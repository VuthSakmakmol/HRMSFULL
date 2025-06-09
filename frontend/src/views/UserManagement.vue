<template>
  <v-card class="pa-4">
    <v-card-title class="d-flex justify-space-between">
      <span>User Management</span>
      <v-btn color="primary" @click="openDialog()">Add User</v-btn>
    </v-card-title>

    <v-data-table
      :headers="headers"
      :items="users"
      :search="search"
      class="elevation-1"
    >
      <template #top>
        <v-text-field
          v-model="search"
          label="Search"
          class="ma-2"
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
        />
      </template>

      <template #item.actions="{ item }">
        <v-btn icon size="small" @click="openDialog(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" @click="deleteUser(item)">
          <v-icon color="red">mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>{{ isEdit ? 'Edit User' : 'Add User' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" variant="outlined" label="Name" required />
          <v-text-field v-model="form.email" variant="outlined" label="Email" :disabled="isEdit" required />
          <v-text-field v-model="form.password" variant="outlined" label="Password" type="password" :required="!isEdit" />
          <v-select
            v-model="form.role"
            :items="roles"
            variant="outlined"
            label="Role"
            required
            :disabled="isEdit"
          />
          <v-select
            v-if="form.role && form.role !== 'GeneralManager'"
            v-model="form.company"
            :items="companies"
            label="Company"
            required
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitForm">{{ isEdit ? 'Update' : 'Create' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios' // ✅ use your custom axios instance
import Swal from 'sweetalert2'

// table headers
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Role', key: 'role' },
  { title: 'Company', key: 'company' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const users = ref([])
const search = ref('')
const dialog = ref(false)
const isEdit = ref(false)

const form = ref({
  _id: '',
  name: '',
  email: '',
  password: '',
  role: '',
  company: ''
})

const roles = ['Manager', 'HROfficer']
const companies = ['CAM-TAC', 'TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS']

// fetch all users
const loadUsers = async () => {
  try {
    const res = await axios.get('/users')
    console.log('✅ Users loaded:', res.data)
    users.value = res.data
  } catch (err) {
    console.error('❌ Load error:', err)
    Swal.fire('Error', err.response?.data?.message || 'Failed to load users', 'error')
  }
}

const openDialog = (user = null) => {
  isEdit.value = !!user
  dialog.value = true
  form.value = user
    ? { ...user, password: '' }
    : { _id: '', name: '', email: '', password: '', role: '', company: '' }
}

const submitForm = async () => {
  try {
    if (isEdit.value) {
      await axios.put(`/users/${form.value._id}`, {
        name: form.value.name,
        password: form.value.password
      })
      Swal.fire('Updated', 'User updated successfully', 'success')
    } else {
      await axios.post('/users', form.value)
      Swal.fire('Created', 'User created successfully', 'success')
    }
    dialog.value = false
    await loadUsers()
  } catch (err) {
    console.error(err)
    Swal.fire('Error', err.response?.data?.message || 'Submit failed', 'error')
  }
}

const deleteUser = async (user) => {
  const confirm = await Swal.fire({
    title: `Delete ${user.name}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes'
  })
  if (confirm.isConfirmed) {
    try {
      await axios.delete(`/users/${user._id}`)
      Swal.fire('Deleted', 'User removed', 'success')
      await loadUsers()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Failed to delete user', 'error')
    }
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.v-data-table {
  font-size: 14px;
}
</style>
