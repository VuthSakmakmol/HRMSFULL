<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <div class="d-flex align-center justify-space-between mb-2">
      <h3 class="text-h6 font-weight-bold">Step 1: Personal Information</h3>

      <!-- quick tip -->
      <v-chip size="small" variant="tonal" color="primary">
        <v-icon start size="16">mdi-lightbulb-on-outline</v-icon>
        Press Enter to jump next field
      </v-chip>
    </div>

    <!-- Image Input + Preview -->
    <v-row dense class="mb-6 align-center">
      <v-col cols="12" md="7">
        <div class="d-flex align-center justify-space-between mb-3">
          <v-btn-toggle
            v-model="imageMode"
            color="primary"
            mandatory
            rounded
            variant="outlined"
          >
            <v-btn value="upload" prepend-icon="mdi-upload">Upload</v-btn>
            <v-btn value="link" prepend-icon="mdi-link">Paste URL</v-btn>
          </v-btn-toggle>

          <v-chip v-if="uploadState === 'uploading'" size="small" variant="tonal" color="indigo">
            <v-progress-circular indeterminate size="14" width="2" class="mr-2" />
            Uploading…
          </v-chip>
        </div>

        <v-file-input
          v-if="imageMode === 'upload'"
          v-model="form.profileImageFile"
          label="Upload Profile Image"
          accept="image/*"
          prepend-icon="mdi-camera"
          show-size
          variant="outlined"
          density="comfortable"
          clearable
          :rules="uploadRules"
          @click:clear="clearImage"
        />

        <v-text-field
          v-else
          v-model.trim="form.profileImage"
          label="Image URL"
          placeholder="https://example.com/image.jpg"
          prepend-icon="mdi-link-variant"
          variant="outlined"
          density="comfortable"
          :rules="urlRules"
          @blur="syncPreviewFromUrl"
        />
        <div class="text-caption text-medium-emphasis mt-1">
          Max 5 MB • JPG/PNG/WebP recommended
        </div>
      </v-col>

      <v-col cols="12" md="3" class="d-flex justify-center">
        <v-sheet class="preview-wrap">
          <v-img
            :src="previewUrl || defaultImage"
            alt="Preview"
            width="120"
            height="160"
            class="rounded-xl"
            cover
          >
            <template #placeholder>
              <v-skeleton-loader type="image" height="160" width="120" />
            </template>
          </v-img>
        </v-sheet>
      </v-col>

      <v-col cols="12" md="2" class="d-flex flex-column ga-2">
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          @click="reuploadIfNeeded"
        >
          Re-upload
        </v-btn>
        <v-btn
          variant="text"
          prepend-icon="mdi-delete"
          @click="clearImage"
        >
          Clear
        </v-btn>
      </v-col>
    </v-row>

    <!-- Personal Info Fields -->
    <v-form ref="formRef" validate-on="input" @submit.prevent>
      <v-row dense>
        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.employeeId"
            label="Employee ID *"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :rules="[required]"
            :ref="setInputRef(0)"
            @keydown.enter="focusNext(0)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.khmerFirstName"
            label="Khmer First Name *"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :rules="[required]"
            :ref="setInputRef(1)"
            @keydown.enter="focusNext(1)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.khmerLastName"
            label="Khmer Last Name *"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :rules="[required]"
            :ref="setInputRef(2)"
            @keydown.enter="focusNext(2)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.englishFirstName"
            label="English First Name *"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :rules="[required]"
            :ref="setInputRef(3)"
            @keydown.enter="focusNext(3)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.englishLastName"
            label="English Last Name *"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :rules="[required]"
            :ref="setInputRef(4)"
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
            :rules="[required]"
            :ref="setInputRef(5)"
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
            :rules="[required]"
            :ref="setInputRef(6)"
            @keydown.enter="focusNext(6)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.number="form.age"
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
            v-model.trim="form.email"
            label="Email"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :rules="emailRules"
            :ref="setInputRef(7)"
            @keydown.enter="focusNext(7)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.phoneNumber"
            label="Phone Number"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :ref="setInputRef(8)"
            @input="normalizePhone('phoneNumber')"
            @keydown.enter="focusNext(8)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.agentPhoneNumber"
            label="Agent Phone"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :ref="setInputRef(9)"
            @input="normalizePhone('agentPhoneNumber')"
            @keydown.enter="focusNext(9)"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.agentPerson"
            label="Agent Person"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            :ref="setInputRef(10)"
            @keydown.enter="focusNext(10)"
          />
        </v-col>
      </v-row>
    </v-form>

    <!-- Action Buttons (only when editing on Step 1) -->
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
        :loading="uploadState === 'uploading'"
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
  form: { type: Object, required: true },
  isEditMode: { type: Boolean, default: false },
  step: { type: Number, default: 1 }
})
const emit = defineEmits(['update:form', 'submitEdit', 'cancelEdit'])

/* ───────────────────────── enums ───────────────────────── */
const enumOptions = ref({ genderOptions: [] })

/* ───────────────────────── image upload/url ───────────────────────── */
const imageMode = ref('upload')
const previewUrl = ref('')
const defaultImage = '/default_images/default_profile.jpg'
const uploadState = ref('idle') // idle | uploading | done | error
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/* ───────────────────────── validation ───────────────────────── */
const formRef = ref(null)
const required = v => (!!v || v === 0) || 'Required'
const emailRules = [
  v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email'
]
const urlRules = [
  v => imageMode.value === 'upload' || !!v || 'Required',
  v => !v || /^https?:\/\/.+/i.test(v) || 'Invalid URL'
]
const uploadRules = [
  // Only validate when in upload mode
  () => imageMode.value !== 'upload' || !props.form.profileImageFile || true
]

/* ───────────────────────── focus helpers ───────────────────────── */
const inputRefs = []
const setInputRef = (i) => (el) => { inputRefs[i] = el }
const focusNext = (index) => {
  const next = inputRefs[index + 1]
  if (next?.focus) next.focus()
}

/* ───────────────────────── phone helpers (no +855) ───────────────────────── */
const normalizePhone = (key) => {
  let v = props.form[key] ?? ''
  v = String(v).replace(/[^\d]/g, '')      // digits only
  if (v && !v.startsWith('0')) v = '0' + v // ensure leading 0
  props.form[key] = v.slice(0, 20)         // hard cap to avoid overlength
}

/* ───────────────────────── image watchers ───────────────────────── */
const syncPreviewFromUrl = () => {
  if (imageMode.value === 'link') previewUrl.value = props.form.profileImage || defaultImage
}

watch(() => props.form.profileImage, (val) => {
  if (imageMode.value === 'link') previewUrl.value = val || defaultImage
})

watch(() => props.form.profileImageFile, async (fileLike) => {
  if (imageMode.value !== 'upload' || !fileLike) return
  const file = Array.isArray(fileLike) ? fileLike[0] : fileLike
  if (!file) return

  // validate
  if (file.size > MAX_SIZE) {
    uploadState.value = 'error'
    console.error('❌ File too large')
    return
  }
  if (!ALLOWED.includes(file.type)) {
    uploadState.value = 'error'
    console.error('❌ Unsupported type')
    return
  }

  previewUrl.value = URL.createObjectURL(file)

  const formData = new FormData()
  formData.append('image', file)
  uploadState.value = 'uploading'
  try {
    const { data } = await axios.post('/upload/hrss/profile-image', formData)
    props.form.profileImage = data.imageUrl
    uploadState.value = 'done'
  } catch (err) {
    uploadState.value = 'error'
    console.error('❌ Auto-upload failed:', err)
    // Keep preview, but do not set profileImage path if failed
  }
})

const reuploadIfNeeded = async () => {
  if (imageMode.value !== 'upload') return
  const fileLike = props.form.profileImageFile
  const file = Array.isArray(fileLike) ? fileLike[0] : fileLike
  if (!file) return
  const formData = new FormData()
  formData.append('image', file)
  uploadState.value = 'uploading'
  try {
    const { data } = await axios.post('/upload/hrss/profile-image', formData)
    props.form.profileImage = data.imageUrl
    uploadState.value = 'done'
  } catch (e) {
    uploadState.value = 'error'
  }
}

const clearImage = () => {
  props.form.profileImageFile = null
  props.form.profileImage = ''
  previewUrl.value = defaultImage
  uploadState.value = 'idle'
}

/* ───────────────────────── expose to parent ───────────────────────── */
const handleFileUpload = async () => {
  const fileLike = props.form.profileImageFile
  const file = Array.isArray(fileLike) ? fileLike[0] : fileLike
  if (!file || imageMode.value !== 'upload') return null
  const formData = new FormData()
  formData.append('image', file)
  uploadState.value = 'uploading'
  const { data } = await axios.post('/upload/hrss/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  props.form.profileImage = data.imageUrl
  uploadState.value = 'done'
  return data.imageUrl
}
defineExpose({ handleFileUpload })

const handleSubmitEdit = async () => {
  // validate core required fields before emitting
  const { valid } = await formRef.value.validate()
  if (!valid) return
  await handleFileUpload()
  emit('submitEdit')
}

/* ───────────────────────── live age ───────────────────────── */
watch(() => props.form.dob, (dob) => {
  if (!dob) { props.form.age = null; return }
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) { props.form.age = null; return }
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  props.form.age = Math.max(0, age)
})

/* ───────────────────────── lifecycle ───────────────────────── */
onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value = data
  } catch (err) {
    console.error('❌ Enum fetch error:', err)
  }
  previewUrl.value = props.form.profileImage || defaultImage
})
</script>

<style scoped>
.preview-wrap {
  border: 1px dashed #e6e8ef;
  border-radius: 12px;
  padding: 8px;
  background: #f8fafc;
  display: inline-flex;
}
.v-btn-toggle .v-btn {
  text-transform: none;
  font-weight: 500;
}
</style>
