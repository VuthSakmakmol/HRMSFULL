<template>
  <v-card flat class="pa-4 mb-4">
    <h3 class="text-subtitle-1 font-weight-bold mb-4">Step 1: Core Identity</h3>

    <!-- Image Upload Mode Switch -->
    <v-btn-toggle v-model="imageMode" color="primary" class="mb-3" mandatory>
      <v-btn value="upload">Upload Image</v-btn>
      <v-btn value="link">Paste URL</v-btn>
    </v-btn-toggle>

    <!-- Image Input -->
    <v-row dense class="mb-4">
      <v-col cols="12" md="6" v-if="imageMode === 'upload'">
        <v-file-input
          v-model="form.profileImageFile"
          label="Upload Image"
          accept="image/*"
          prepend-icon="mdi-camera"
          @change="handleFileUpload"
        />
      </v-col>

      <v-col cols="12" md="6" v-if="imageMode === 'link'">
        <v-text-field
          v-model="form.profileImage"
          label="Image URL"
          placeholder="https://example.com/image.jpg"
        />
      </v-col>

      <v-col cols="12">
        <v-img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Preview"
          width="120"
          height="120"
          class="rounded mt-2"
        />
      </v-col>
    </v-row>

    <!-- Personal Info Fields -->
    <v-row dense>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.employeeId" label="Employee ID *" dense variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.khmerFirstName" label="Khmer First Name *" dense variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.khmerLastName" label="Khmer Last Name *" dense variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.englishFirstName" label="English First Name *" dense variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.englishLastName" label="English Last Name *" dense variant="outlined" autocomplete="off" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.gender"
          :items="enumOptions.genderOptions"
          label="Gender *"
          dense variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.dob" label="Date of Birth *" type="date" dense variant="outlined" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.age" label="Age" type="number" dense variant="outlined" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.email" label="Email" dense variant="outlined" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.phoneNumber" label="Phone Number" dense variant="outlined" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.agentPhoneNumber" label="Agent Phone Number" dense variant="outlined" />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field v-model="form.agentPerson" label="Agent Person" dense variant="outlined" />
      </v-col>
    </v-row>

    <!-- Buttons for Edit Mode -->
    <v-row justify="end" class="mt-4" v-if="isEditMode">
      <v-btn variant="outlined" color="grey" @click="emit('cancelEdit')">Cancel</v-btn>
      <v-btn color="primary" class="ml-2" @click="emit('submitEdit')">Update</v-btn>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({
  form: Object,
  isEditMode: Boolean
})
const emit = defineEmits(['update:form', 'submitEdit', 'cancelEdit'])

const enumOptions = ref({ genderOptions: [] })
const imageMode = ref('upload')
const previewUrl = ref('')

// 🔁 Watch for imageURL changes when using 'link' mode
watch(() => props.form.profileImage, (val) => {
  if (imageMode.value === 'link') {
    previewUrl.value = val
  }
})

// 🔃 Upload + preview when image file selected
const handleFileUpload = async () => {
  const file = props.form.profileImageFile
  if (!file) return

  try {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await axios.post('/upload/profile-image', formData)
    emit('update:form', { ...props.form, profileImage: data.imageUrl }) // store image URL
    previewUrl.value = data.imageUrl
  } catch (err) {
    console.error('❌ Image upload failed:', err)
    alert('Image upload failed')
  }
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (err) {
    console.error('❌ Failed to fetch enum options:', err)
  }

  // 👁 Initialize preview if already in edit mode
  if (props.form.profileImage && imageMode.value === 'link') {
    previewUrl.value = props.form.profileImage
  }
})
</script>

<style scoped>
.v-btn-toggle .v-btn {
  text-transform: none;
  font-weight: 500;
}
</style>
