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
          label="Upload Profile Image"
          accept="image/*"
          prepend-icon="mdi-camera"
          show-size
          outlined
        />
      </v-col>

      <v-col cols="12" md="6" v-if="imageMode === 'link'">
        <v-text-field
          v-model="form.profileImage"
          label="Image URL"
          placeholder="https://example.com/image.jpg"
        />
      </v-col>

      <!-- Preview Image -->
      <v-col cols="12">
        <v-img
          :src="previewUrl || defaultImage"
          alt="Preview"
          width="120"
          height="120"
          class="rounded mt-2"
          style="border: 1px solid #ccc"
        >
          <template #placeholder>
            <v-skeleton-loader type="image" height="120" width="120" />
          </template>
        </v-img>
      </v-col>
    </v-row>

    <!-- Personal Info -->
    <v-row dense>
      <v-col cols="12" sm="2"><v-text-field v-model="form.employeeId" label="Employee ID *" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.khmerFirstName" label="Khmer First Name *" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.khmerLastName" label="Khmer Last Name *" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.englishFirstName" label="English First Name *" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.englishLastName" label="English Last Name *" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-select v-model="form.gender" :items="enumOptions.genderOptions" label="Gender *" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.dob" label="Date of Birth *" type="date" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.age" label="Age" type="number" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.email" label="Email" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.phoneNumber" label="Phone Number" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.agentPhoneNumber" label="Agent Phone Number" dense variant="outlined" /></v-col>
      <v-col cols="12" sm="2"><v-text-field v-model="form.agentPerson" label="Agent Person" dense variant="outlined" /></v-col>
    </v-row>

    <!-- Edit Mode Buttons (Only show on Step 1) -->
    <v-row justify="end" class="mt-4" v-if="isEditMode && step === 1">
      <v-btn variant="outlined" color="grey" @click="emit('cancelEdit')">Cancel</v-btn>
      <v-btn color="primary" class="ml-2" @click="handleSubmitEdit">Update</v-btn>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({
  form: Object,
  isEditMode: Boolean,
  step: Number
})
const emit = defineEmits(['update:form', 'submitEdit', 'cancelEdit'])

const enumOptions = ref({ genderOptions: [] })
const imageMode = ref('upload')
const previewUrl = ref('')
const defaultImage = '/default_images/default_profile.jpg'

watch(() => props.form.profileImage, (val) => {
  if (imageMode.value === 'link') previewUrl.value = val
})

watch(() => props.form.profileImageFile, async (file) => {
  if (file && imageMode.value === 'upload') {
    const blob = URL.createObjectURL(file)
    previewUrl.value = blob

    const formData = new FormData()
    formData.append('image', file)

    try {
      const { data } = await axios.post('/upload/hrss/profile-image', formData)
      props.form.profileImage = data.imageUrl
      console.log('✅ Auto-upload complete:', data.imageUrl)
    } catch (err) {
      console.error('❌ Auto-upload failed:', err)
      alert('Image upload failed')
    }
  }
})

const handleFileUpload = async () => {
  const file = props.form.profileImageFile
  if (!file || imageMode.value !== 'upload') {
    console.warn('⚠️ No file or mode is not upload')
    return null
  }

  const formData = new FormData()
  formData.append('image', file)

  const { data } = await axios.post('/upload/hrss/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  props.form.profileImage = data.imageUrl
  return data.imageUrl
}

defineExpose({ handleFileUpload })

const handleSubmitEdit = async () => {
  await handleFileUpload()
  emit('submitEdit')
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (err) {
    console.error('❌ Enum fetch error:', err)
  }

  if (props.form.profileImage) {
    previewUrl.value = props.form.profileImage
  } else {
    previewUrl.value = defaultImage
  }
})
</script>

<style scoped>
.v-btn-toggle .v-btn {
  text-transform: none;
  font-weight: 500;
}
</style>
