<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-6"> Step 1: Personal Information</h3>

    <!-- Image Input + Preview in one row -->
    <v-row dense align-center="center" class="mb-6">
      <v-col cols="12" md="6">
        <v-btn-toggle
          v-model="imageMode"
          color="primary"
          mandatory
          rounded
          variant="outlined"
          class="mb-3"
        >
          <v-btn value="upload" prepend-icon="mdi-upload">Upload</v-btn>
          <v-btn value="link" prepend-icon="mdi-link">Paste URL</v-btn>
        </v-btn-toggle>

        <v-file-input
          v-if="imageMode === 'upload'"
          v-model="form.profileImageFile"
          label="Upload Profile Image"
          accept="image/*"
          prepend-icon="mdi-camera"
          show-size
          variant="outlined"
          density="comfortable"
        />

        <v-text-field
          v-else
          v-model="form.profileImage"
          label="Image URL"
          placeholder="https://example.com/image.jpg"
          prepend-icon="mdi-link-variant"
          variant="outlined"
          density="comfortable"
        />
      </v-col>

      <v-col cols="12" md="2" class="d-flex justify-center">
        <v-img
          :src="previewUrl || defaultImage"
          alt="Preview"
          width="80"
          height="120"
          class="rounded-xl elevation-2 transition-ease-in-out"
          style="border: 2px solid #ddd"
        >
          <template #placeholder>
            <v-skeleton-loader type="image" height="120" width="120" />
          </template>
        </v-img>
      </v-col>
    </v-row>


    <!-- Personal Info Fields -->
    <v-row dense>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.employeeId"
          label="Employee ID *"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[0] = el"
          @keydown.enter="focusNext(0)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.khmerFirstName"
          label="Khmer First Name *"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[1] = el"
          @keydown.enter="focusNext(1)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.khmerLastName"
          label="Khmer Last Name *"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[2] = el"
          @keydown.enter="focusNext(2)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.englishFirstName"
          label="English First Name *"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[3] = el"
          @keydown.enter="focusNext(3)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.englishLastName"
          label="English Last Name *"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[4] = el"
          @keydown.enter="focusNext(4)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.gender"
          :items="enumOptions.genderOptions"
          label="Gender *"
          variant="outlined"
          density="comfortable"
          :ref="el => inputRefs[5] = el"
          @keydown.enter="focusNext(5)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.dob"
          label="Date of Birth *"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[6] = el"
          @keydown.enter="focusNext(6)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.age"
          label="Age"
          type="number"
          readonly
          variant="outlined"
          density="comfortable"
          autocomplete="off"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.email"
          label="Email"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[7] = el"
          @keydown.enter="focusNext(7)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.phoneNumber"
          label="Phone Number"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[8] = el"
          @keydown.enter="focusNext(8)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.agentPhoneNumber"
          label="Agent Phone"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[9] = el"
          @keydown.enter="focusNext(9)"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.agentPerson"
          label="Agent Person"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="el => inputRefs[10] = el"
          @keydown.enter="focusNext(10)"
        />
      </v-col>
    </v-row>


    <!-- Action Buttons -->
    <v-row justify="end" class="mt-6" v-if="isEditMode && step === 1">
      <v-btn
        variant="text"
        color="grey"
        class="mr-2"
        prepend-icon="mdi-close-circle-outline"
        @click="emit('cancelEdit')"
      >
        Cancel
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-check-circle"
        class="text-white"
        @click="handleSubmitEdit"
      >
        Update
      </v-btn>
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


const inputRefs = []
const focusNext = (index) => {
  const next = inputRefs[index + 1]
  if (next?.focus) next.focus()
}



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

watch(() => props.form.dob, (dob) => {
  if (!dob) return

  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  props.form.age = age
})


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
