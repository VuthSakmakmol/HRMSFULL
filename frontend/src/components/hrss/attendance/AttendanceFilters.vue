<template>
  <v-row class="mt-1" dense>
    <v-col cols="12" sm="4">
      <v-autocomplete
        v-model="selTemplateId"
        :items="templateItems"
        item-title="name"
        item-value="_id"
        label="Shift Template"
        density="compact"
        variant="outlined"
        clearable
        hide-details
        @update:model-value="emitChanged"
      />
    </v-col>

    <v-col cols="12" sm="4">
      <v-text-field
        v-model="selShiftName"
        label="Shift Name (legacy or quick filter)"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        @input="emitChanged"
      />
    </v-col>

    <v-col cols="12" sm="4">
      <v-text-field
        v-model="search"
        label="Search employee (ID/Name)"
        append-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        @input="emitChanged"
      />
    </v-col>

    <v-col cols="12" sm="4">
      <v-menu v-model="menu" :close-on-content-click="false" transition="scale-transition" offset-y>
        <template #activator="{ props }">
          <v-text-field
            v-bind="props"
            v-model="date"
            label="Filter by Date"
            density="compact"
            variant="outlined"
            append-inner-icon="mdi-calendar"
            readonly
            hide-details
          />
        </template>
        <v-date-picker v-model="date" @update:modelValue="onDateChange" />
      </v-menu>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  templates: { type: Array, default: () => [] },
  modelValueTemplateId: { type: String, default: '' },
  modelValueShiftName: { type: String, default: '' },
  modelValueSearch: { type: String, default: '' },
  modelValueDate: { type: String, default: '' },
})
const emit = defineEmits(['update:template-id','update:shift-name','update:search','update:date','changed'])

const selTemplateId = ref(props.modelValueTemplateId)
const selShiftName  = ref(props.modelValueShiftName)
const search        = ref(props.modelValueSearch)
const date          = ref(props.modelValueDate)
const menu          = ref(false)

watch(() => props.modelValueTemplateId, v => selTemplateId.value = v)
watch(() => props.modelValueShiftName,  v => selShiftName.value  = v)
watch(() => props.modelValueSearch,     v => search.value        = v)
watch(() => props.modelValueDate,       v => date.value          = v)

const templateItems = computed(() => props.templates || [])

const emitChanged = () => {
  emit('update:template-id', selTemplateId.value || '')
  emit('update:shift-name',  selShiftName.value || '')
  emit('update:search',      search.value || '')
  emit('changed')
}
const onDateChange = () => {
  emit('update:date', date.value)
  emit('changed')
}
</script>
