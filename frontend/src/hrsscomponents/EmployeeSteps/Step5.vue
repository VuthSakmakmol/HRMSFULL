<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <div class="d-flex align-center justify-space-between mb-2">
      <h3 class="text-h6 font-weight-bold">Step 5: Skills &amp; Location</h3>

      <!-- Sync toggle -->
      <v-btn
        size="small"
        :color="sameAsBirth ? 'green' : 'primary'"
        variant="tonal"
        @click="toggleSameAsBirth"
      >
        <v-icon start>{{ sameAsBirth ? 'mdi-link' : 'mdi-link-variant' }}</v-icon>
        {{ sameAsBirth ? 'Synced from Birth' : 'Same as Place of Birth' }}
      </v-btn>
    </div>

    <!-- Scroll container for the whole step -->
    <div class="scroll-x">
      <!-- 🔵 Place of Birth -->
      <v-row dense class="minw">
        <v-col cols="12">
          <h4 class="text-subtitle-2 font-weight-medium mt-2 mb-2">Place of Birth</h4>
        </v-col>

        <v-col cols="12" sm="2">
          <v-autocomplete
            v-model="form.placeOfBirth.provinceNameKh"
            :items="provinceOptions"
            :loading="loading.birth.province"
            label="Province"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="birth-province"
            clearable
            @update:modelValue="onBirthProvinceChange"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-autocomplete
            v-model="form.placeOfBirth.districtNameKh"
            :items="birthDistricts"
            :loading="loading.birth.district"
            label="District"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="birth-district"
            clearable
            :disabled="!form.placeOfBirth.provinceNameKh"
            @update:modelValue="onBirthDistrictChange"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-autocomplete
            v-model="form.placeOfBirth.communeNameKh"
            :items="birthCommunes"
            :loading="loading.birth.commune"
            label="Commune"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="birth-commune"
            clearable
            :disabled="!form.placeOfBirth.districtNameKh"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.placeOfBirth.villageNameKh"
            label="Village"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="birth-village"
            clearable
          />
        </v-col>
      </v-row>

      <!-- 🔴 Place of Living -->
      <v-row dense class="minw mt-4">
        <v-col cols="12">
          <h4 class="text-subtitle-2 font-weight-medium mb-2">Place of Living</h4>
        </v-col>

        <v-col cols="12" sm="2">
          <v-autocomplete
            v-model="form.placeOfLiving.provinceNameKh"
            :items="provinceOptions"
            :loading="loading.living.province"
            label="Province"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="living-province"
            clearable
            :disabled="sameAsBirth"
            @update:modelValue="onLivingProvinceChange"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-autocomplete
            v-model="form.placeOfLiving.districtNameKh"
            :items="livingDistricts"
            :loading="loading.living.district"
            label="District"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="living-district"
            clearable
            :disabled="sameAsBirth || !form.placeOfLiving.provinceNameKh"
            @update:modelValue="onLivingDistrictChange"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-autocomplete
            v-model="form.placeOfLiving.communeNameKh"
            :items="livingCommunes"
            :loading="loading.living.commune"
            label="Commune"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="living-commune"
            clearable
            :disabled="sameAsBirth || !form.placeOfLiving.districtNameKh"
          />
        </v-col>

        <v-col cols="12" sm="2">
          <v-text-field
            v-model.trim="form.placeOfLiving.villageNameKh"
            label="Village"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="living-village"
            clearable
            :disabled="sameAsBirth"
          />
        </v-col>
      </v-row>

      <!-- ✍️ Opinion -->
      <v-row dense class="minw mt-4">
        <v-col cols="12">
          <h4 class="text-subtitle-2 font-weight-medium mb-2">Opinion</h4>
        </v-col>

        <v-col cols="12" sm="3">
          <v-textarea
            v-model.trim="form.remark"
            label="Remark"
            rows="3"
            auto-grow
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="remark"
            clearable
          />
        </v-col>

        <v-col cols="12" sm="3">
          <v-textarea
            v-model.trim="form.note"
            label="Note"
            rows="3"
            auto-grow
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            name="note"
            clearable
          />
        </v-col>
      </v-row>
    </div>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({ form: Object })
const form = props.form

/* ───────────────────────── options & state ───────────────────────── */
const provinceOptions = ref([])

const birthDistricts = ref([])
const birthCommunes = ref([])
const livingDistricts = ref([])
const livingCommunes = ref([])

const sameAsBirth = ref(false)

/* small loading flags for UX */
const loading = ref({
  birth: { province: false, district: false, commune: false },
  living: { province: false, district: false, commune: false }
})

/* simple caches to avoid refetching */
const districtsCache = ref(new Map()) // key: province -> array
const communesCache = ref(new Map())  // key: `${province}|${district}` -> array

/* ───────────────────────── init ───────────────────────── */
onMounted(async () => {
  try {
    loading.value.birth.province = true
    loading.value.living.province = true
    const { data } = await axios.get('/location/provinces')
    provinceOptions.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Failed to load provinces:', err)
  } finally {
    loading.value.birth.province = false
    loading.value.living.province = false
  }

  // hydrate living from birth if flag was saved somewhere (optional)
  if (sameAsBirth.value) syncBirthToLiving()
})

/* ───────────────────────── syncing helpers ───────────────────────── */
const toggleSameAsBirth = () => {
  sameAsBirth.value = !sameAsBirth.value
  if (sameAsBirth.value) syncBirthToLiving()
}

const syncBirthToLiving = () => {
  form.placeOfLiving.provinceNameKh = form.placeOfBirth.provinceNameKh
  form.placeOfLiving.districtNameKh = form.placeOfBirth.districtNameKh
  form.placeOfLiving.communeNameKh = form.placeOfBirth.communeNameKh
  form.placeOfLiving.villageNameKh = form.placeOfBirth.villageNameKh
  // also mirror the option lists (for display only)
  livingDistricts.value = [...birthDistricts.value]
  livingCommunes.value = [...birthCommunes.value]
}

// Auto-sync if ON and user changes any birth fields
watch(() => form.placeOfBirth, () => { if (sameAsBirth.value) syncBirthToLiving() }, { deep: true })

/* ───────────────────────── API helpers with caching ───────────────────────── */
const fetchDistricts = async (province) => {
  if (!province) return []
  const cached = districtsCache.value.get(province)
  if (cached) return cached
  const { data } = await axios.get('/location/districts', { params: { province } })
  const arr = Array.isArray(data) ? data : []
  districtsCache.value.set(province, arr)
  return arr
}

const fetchCommunes = async (province, district) => {
  if (!province || !district) return []
  const key = `${province}|${district}`
  const cached = communesCache.value.get(key)
  if (cached) return cached
  const { data } = await axios.get('/location/communes', { params: { province, district } })
  const arr = Array.isArray(data) ? data : []
  communesCache.value.set(key, arr)
  return arr
}

/* ───────────────────────── Birth handlers ───────────────────────── */
const onBirthProvinceChange = async (province) => {
  // reset chain
  form.placeOfBirth.districtNameKh = ''
  form.placeOfBirth.communeNameKh = ''
  form.placeOfBirth.villageNameKh = ''
  birthDistricts.value = []
  birthCommunes.value = []

  if (!province) return
  try {
    loading.value.birth.district = true
    birthDistricts.value = await fetchDistricts(province)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value.birth.district = false
  }
}

const onBirthDistrictChange = async (district) => {
  form.placeOfBirth.communeNameKh = ''
  birthCommunes.value = []
  if (!district) return
  try {
    loading.value.birth.commune = true
    birthCommunes.value = await fetchCommunes(form.placeOfBirth.provinceNameKh, district)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value.birth.commune = false
  }
}

/* ───────────────────────── Living handlers ───────────────────────── */
const onLivingProvinceChange = async (province) => {
  if (sameAsBirth.value) return
  form.placeOfLiving.districtNameKh = ''
  form.placeOfLiving.communeNameKh = ''
  form.placeOfLiving.villageNameKh = ''
  livingDistricts.value = []
  livingCommunes.value = []

  if (!province) return
  try {
    loading.value.living.district = true
    livingDistricts.value = await fetchDistricts(province)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value.living.district = false
  }
}

const onLivingDistrictChange = async (district) => {
  if (sameAsBirth.value) return
  form.placeOfLiving.communeNameKh = ''
  livingCommunes.value = []
  if (!district) return
  try {
    loading.value.living.commune = true
    livingCommunes.value = await fetchCommunes(form.placeOfLiving.provinceNameKh, district)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value.living.commune = false
  }
}
</script>

<style scoped>
/* Horizontal scroll for small screens or very wide content */
.scroll-x {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Ensure rows don’t collapse; tweak min width to your taste */
.minw {
  min-width: 920px; /* makes the section scroll horizontally when viewport is narrow */
}
</style>
