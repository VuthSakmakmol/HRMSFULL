<template>
  <v-card flat class="pa-4 mb-6 rounded-xl elevation-1">
    <div class="d-flex align-center justify-space-between mb-2">
      <h3 class="text-h6 font-weight-bold">Step 4: Document Info</h3>
      <div class="d-flex flex-wrap ga-2">
        <v-chip v-if="expChip.id.show" :color="expChip.id.color" size="small" variant="tonal">
          <v-icon start size="16">mdi-card-account-details</v-icon>{{ expChip.id.label }}
        </v-chip>
        <v-chip v-if="expChip.passport.show" :color="expChip.passport.color" size="small" variant="tonal">
          <v-icon start size="16">mdi-passport</v-icon>{{ expChip.passport.label }}
        </v-chip>
        <v-chip v-if="expChip.visa.show" :color="expChip.visa.color" size="small" variant="tonal">
          <v-icon start size="16">mdi-airplane</v-icon>{{ expChip.visa.label }}
        </v-chip>
        <v-chip v-if="expChip.medical.show" :color="expChip.medical.color" size="small" variant="tonal">
          <v-icon start size="16">mdi-hospital-box</v-icon>{{ expChip.medical.label }}
        </v-chip>
      </div>
    </div>

    <v-row dense>
      <!-- 🎓 Education -->
      <v-col cols="12" sm="2">
        <v-select
          v-model="form.education"
          :items="enumOptions.educationOptions"
          label="Education"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(0)"
          @keydown.enter.prevent="focusNext(0)"
          clearable
        />
      </v-col>

      <!-- 📄 ID / NSSF -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.idCard"
          label="ID Card"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(1)"
          @input="digitsOnly('idCard', 30)"
          @keydown.enter.prevent="focusNext(1)"
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.idCardExpireDate"
          label="ID Expiry Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(2)"
          @keydown.enter.prevent="focusNext(2)"
          :error="!!dateErrors.id"
          :error-messages="dateErrors.id"
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.nssf"
          label="NSSF"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(3)"
          @input="digitsOnly('nssf', 30)"
          @keydown.enter.prevent="focusNext(3)"
          clearable
        />
      </v-col>

      <!-- 🛂 Passport / Visa -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.passport"
          label="Passport"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(4)"
          @input="alnumUpper('passport', 20)"
          @keydown.enter.prevent="focusNext(4)"
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.passportExpireDate"
          label="Passport Expiry"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(5)"
          @keydown.enter.prevent="focusNext(5)"
          :error="!!dateErrors.passport"
          :error-messages="dateErrors.passport"
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.visaExpireDate"
          label="Visa Expiry"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(6)"
          @keydown.enter.prevent="focusNext(6)"
          :error="!!dateErrors.visa"
          :error-messages="dateErrors.visa"
          clearable
        />
      </v-col>

      <!-- 🧪 Medical & Work Book -->
      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.medicalCheck"
          label="Medical Check"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(7)"
          @keydown.enter.prevent="focusNext(7)"
          clearable
          hint="e.g., Serology, X-ray"
          persistent-hint
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="form.medicalCheckDate"
          label="Medical Check Date"
          type="date"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(8)"
          @keydown.enter.prevent="focusNext(8)"
          :error="!!dateErrors.medical"
          :error-messages="dateErrors.medical"
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model.trim="form.workingBook"
          label="Working Book"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          :ref="setRef(9)"
          @input="alnumUpper('workingBook', 30)"
          @keydown.enter.prevent="focusNext(9)"
          clearable
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from '@/utils/axios'

const props = defineProps({ form: Object })
const form = props.form

/* ───────────────────────── enums ───────────────────────── */
const enumOptions = ref({ educationOptions: [] })

onMounted(async () => {
  try {
    const { data } = await axios.get('/meta/enums')
    enumOptions.value.educationOptions = data.educationOptions || []
  } catch (err) {
    console.error('❌ Failed to load enums in Step 4:', err)
  }
})

/* ───────────────────────── input helpers ───────────────────────── */
const digitsOnly = (key, max = 50) => {
  let v = form[key] ?? ''
  v = String(v).replace(/[^\d]/g, '')
  form[key] = v.slice(0, max)
}

const alnumUpper = (key, max = 50) => {
  let v = form[key] ?? ''
  v = String(v).replace(/[^0-9a-z]/gi, '').toUpperCase()
  form[key] = v.slice(0, max)
}

/* ───────────────────────── expiry chips ───────────────────────── */
const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const d = new Date(dateStr); if (isNaN(d)) return null
  const today = new Date()
  // normalize to local midnight to avoid TZ off-by-one
  d.setHours(0,0,0,0); today.setHours(0,0,0,0)
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24))
  return diff
}

const mkChip = (dateStr, labelBase) => {
  const d = daysUntil(dateStr)
  if (d === null) return { show: false }
  if (d < 0) return { show: true, color: 'error', label: `${labelBase}: Expired ${Math.abs(d)}d ago` }
  if (d <= 30) return { show: true, color: 'warning', label: `${labelBase}: In ${d}d` }
  return { show: true, color: 'success', label: `${labelBase}: ${d}d` }
}

const expChip = computed(() => ({
  id: mkChip(form.idCardExpireDate, 'ID'),
  passport: mkChip(form.passportExpireDate, 'Passport'),
  visa: mkChip(form.visaExpireDate, 'Visa'),
  medical: mkChip(form.medicalCheckDate, 'Medical')
}))

/* ───────────────────────── basic date sanity checks ───────────────────────── */
const dateErrors = ref({ id: '', passport: '', visa: '', medical: '' })

watch(
  () => [form.idCardExpireDate, form.passportExpireDate, form.visaExpireDate, form.medicalCheckDate],
  () => {
    dateErrors.value = { id: '', passport: '', visa: '', medical: '' }
    const today = new Date(); today.setHours(0,0,0,0)

    const check = (val) => {
      if (!val) return null
      const d = new Date(val)
      return isNaN(d) ? 'Invalid date' : null
    }

    dateErrors.value.id = check(form.idCardExpireDate)
    dateErrors.value.passport = check(form.passportExpireDate)
    dateErrors.value.visa = check(form.visaExpireDate)
    dateErrors.value.medical = check(form.medicalCheckDate)

    // Example cross-checks (optional, comment out if not wanted):
    // - Passport expiry usually in the future
    if (!dateErrors.value.passport && form.passportExpireDate) {
      const p = new Date(form.passportExpireDate); p.setHours(0,0,0,0)
      if (p < today) dateErrors.value.passport = 'Passport expiry is in the past'
    }
  },
  { immediate: true }
)

/* ───────────────────────── Enter-to-next order ───────────────────────── */
const inputRefs = []
const setRef = (i) => (el) => { inputRefs[i] = el }
const focusNext = (idx) => {
  const next = inputRefs[idx + 1]
  if (next?.focus) next.focus()
}
</script>
