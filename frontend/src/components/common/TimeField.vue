<!-- src/components/common/TimeField.vue -->
<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    max-width="320"
  >
    <template #activator="{ props }">
      <v-text-field
        v-bind="props"
        v-model="display"
        :label="label"
        :placeholder="placeholder"
        readonly
        variant="outlined"
        density="compact"
        hide-details
        clearable
        @click:clear="clear"
      />
    </template>

    <v-card>
      <v-time-picker
        v-model="time"                
        format="ampm"
        ampm-in-title
        scrollable
        @update:model-value="onPick" 
      />
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="menu = false">Cancel</v-btn>
        <v-btn text color="primary" @click="apply">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, watch } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  modelValue: { type: String, default: '' }, // stored as 'HH:mm'
  label: String,
  placeholder: String
})
const emit = defineEmits(['update:modelValue'])

const menu = ref(false)
const time = ref(null)   // local string 'HH:mm'
const display = ref('')

/* sync from parent -> local */
watch(() => props.modelValue, (val) => {
  if (val) {
    time.value = val
    display.value = dayjs(`2000-01-01 ${val}`).format('hh:mm A')
  } else {
    time.value = null
    display.value = ''
  }
}, { immediate: true })

/* write helpers */
const commit = (val) => {
  if (!val) return
  // ensure 24h 'HH:mm' to parent
  const hhmm = dayjs(`2000-01-01 ${val}`).format('HH:mm')
  emit('update:modelValue', hhmm)
  // pretty 12h display locally
  display.value = dayjs(`2000-01-01 ${hhmm}`).format('hh:mm A')
}

const onPick = (val) => {
  // auto-apply as soon as the user picks hours/minutes or toggles AM/PM
  commit(val)
}

const apply = () => { commit(time.value); menu.value = false }
const clear = () => { time.value = null; display.value = ''; emit('update:modelValue', '') }
</script>
