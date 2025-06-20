<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <h3 class="text-h6 font-weight-bold mb-2"> Step 5: Skills & Location</h3>

    <!-- 🔵 Place of Birth -->
    <v-row dense>
      <v-col cols="12">
        <h4 class="text-subtitle-2 font-weight-medium mt-2 mb-2">Place of Birth</h4>
      </v-col>
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="form.placeOfBirth.provinceNameKh"
          :items="provinceOptions"
          label="Province"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="birth-province"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="form.placeOfBirth.districtNameKh"
          :items="birthDistricts"
          label="District"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="birth-district"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="form.placeOfBirth.communeNameKh"
          :items="birthCommunes"
          label="Commune"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="birth-commune"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.placeOfBirth.villageNameKh"
          label="Village"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="birth-village"
        />
      </v-col>
    </v-row>

    <!-- 🔴 Place of Living -->
    <v-row dense>
      <v-col cols="12" class="d-flex align-center">
        <h4 class="text-subtitle-2 font-weight-medium mt-4 mb-2 me-4">Place of Living</h4>
        <v-btn
          size="small"
          :color="sameAsBirth ? 'green' : 'primary'"
          variant="tonal"
          class="mt-n1"
          @click="toggleSameAsBirth"
        >
          {{ sameAsBirth ? 'Synced from Birth' : 'Same as Place of Birth' }}
        </v-btn>
      </v-col>
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="form.placeOfLiving.provinceNameKh"
          :items="provinceOptions"
          label="Province"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="living-province"
          :disabled="sameAsBirth"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="form.placeOfLiving.districtNameKh"
          :items="livingDistricts"
          label="District"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="living-district"
          :disabled="sameAsBirth"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-autocomplete
          v-model="form.placeOfLiving.communeNameKh"
          :items="livingCommunes"
          label="Commune"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="living-commune"
          :disabled="sameAsBirth"
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.placeOfLiving.villageNameKh"
          label="Village"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="living-village"
          :disabled="sameAsBirth"
        />
      </v-col>
    </v-row>

    <!-- ✍️ Opinion Fields -->
    <v-row dense>
      <v-col cols="12">
        <h4 class="text-subtitle-2 font-weight-medium mb-2">Opinion</h4>
      </v-col>
      <v-col cols="12" sm="3">
        <v-textarea
          v-model="form.remark"
          label="Remark"
          rows="3"
          auto-grow
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="remark"
        />
      </v-col>
      <v-col cols="12" sm="3">
        <v-textarea
          v-model="form.note"
          label="Note"
          rows="3"
          auto-grow
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          name="note"
        />
      </v-col>
    </v-row>
  </v-card>
</template>


<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({ form: Object })

const provinceOptions = ref([])
const birthDistricts = ref([])
const birthCommunes = ref([])
const livingDistricts = ref([])
const livingCommunes = ref([])

const sameAsBirth = ref(false)

const toggleSameAsBirth = () => {
  sameAsBirth.value = !sameAsBirth.value
  if (sameAsBirth.value) {
    syncBirthToLiving()
  }
}

const syncBirthToLiving = () => {
  props.form.placeOfLiving.provinceNameKh = props.form.placeOfBirth.provinceNameKh
  props.form.placeOfLiving.districtNameKh = props.form.placeOfBirth.districtNameKh
  props.form.placeOfLiving.communeNameKh = props.form.placeOfBirth.communeNameKh
  props.form.placeOfLiving.villageNameKh = props.form.placeOfBirth.villageNameKh
}

// Auto-sync if sameAsBirth is ON and user changes anything in birth fields
watch(() => props.form.placeOfBirth, () => {
  if (sameAsBirth.value) syncBirthToLiving()
}, { deep: true })

// ✅ Load provinces on mount
onMounted(async () => {
  try {
    const { data } = await axios.get('/location/provinces')
    provinceOptions.value = data
  } catch (err) {
    console.error('Failed to load provinces:', err)
  }
})

// 🔵 Place of Birth Watchers
watch(() => props.form.placeOfBirth.provinceNameKh, async (province) => {
  props.form.placeOfBirth.districtNameKh = ''
  props.form.placeOfBirth.communeNameKh = ''
  props.form.placeOfBirth.villageNameKh = ''
  birthDistricts.value = []
  birthCommunes.value = []
  if (province) {
    const { data } = await axios.get('/location/districts', { params: { province } })
    birthDistricts.value = data
  }
})

watch(() => props.form.placeOfBirth.districtNameKh, async (district) => {
  props.form.placeOfBirth.communeNameKh = ''
  birthCommunes.value = []
  if (district) {
    const { data } = await axios.get('/location/communes', {
      params: {
        province: props.form.placeOfBirth.provinceNameKh,
        district
      }
    })
    birthCommunes.value = data
  }
})

// 🔴 Place of Living Watchers
watch(() => props.form.placeOfLiving.provinceNameKh, async (province) => {
  if (sameAsBirth.value) return
  props.form.placeOfLiving.districtNameKh = ''
  props.form.placeOfLiving.communeNameKh = ''
  livingDistricts.value = []
  livingCommunes.value = []
  if (province) {
    const { data } = await axios.get('/location/districts', { params: { province } })
    livingDistricts.value = data
  }
})

watch(() => props.form.placeOfLiving.districtNameKh, async (district) => {
  if (sameAsBirth.value) return
  props.form.placeOfLiving.communeNameKh = ''
  livingCommunes.value = []
  if (district) {
    const { data } = await axios.get('/location/communes', {
      params: {
        province: props.form.placeOfLiving.provinceNameKh,
        district
      }
    })
    livingCommunes.value = data
  }
})
</script>
