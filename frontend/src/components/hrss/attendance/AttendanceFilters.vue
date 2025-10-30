<!--src/components/hrss/attendance/AttendanceFilters.vue-->
<template>
  <v-row class="gap-2" align-center="center">
    <!-- Shift Template -->
    <v-col cols="12" sm="3">
      <v-select
        :items="templates"
        item-title="name"
        item-value="_id"
        label="Shift Template"
        variant="outlined"
        density="comfortable"
        :model-value="templateId"
        @update:model-value="v => emit('update:template-id', v || '')"
      />
    </v-col>



    <!-- Search -->
    <v-col cols="12" sm="3">
      <v-text-field
        label="Search employee…"
        variant="outlined"
        density="comfortable"
        :model-value="search"
        @update:model-value="v => emit('update:search', v || '')"
        clearable
      />
    </v-col>

    <!-- Date (display DD-MM-YYYY, emit YYYY-MM-DD) -->
    <v-col cols="12" sm="3">
      <v-menu
        v-model="menu"
        :close-on-content-click="false"
        transition="scale-transition"
        offset-y
        max-width="320"
        min-width="320"
      >
        <template #activator="{ props }">
          <v-text-field
            v-bind="props"
            label="Filter by Date"
            variant="outlined"
            density="comfortable"
            readonly
            :model-value="formattedDate"
            prepend-inner-icon="mdi-calendar"
            @click:prepend-inner="menu = true"
          />
        </template>

        <v-date-picker
          v-model="internalDate"
          @update:model-value="onPick"
          :max="maxDate"
          show-adjacent-months
        />
      </v-menu>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import dayjs from '@/plugins/dayjs'

const props = defineProps({
  templates:  { type: Array,  default: () => [] },
  templateId: { type: String, default: '' },
  search:     { type: String, default: '' },
  /** Parent passes a STRING "YYYY-MM-DD" */
  date:       { type: String, default: '' },
})

const emit = defineEmits([
  'update:template-id',
  'update:shift-name',
  'update:search',
  'update:date',
  'changed'
])

const menu = ref(false)

/** Internal Date object for picker UI only */
const internalDate = ref(props.date ? dayjs(props.date).toDate() : new Date())

/** Keep picker in sync if parent updates the string date */
watch(() => props.date, (val) => {
  if (val) internalDate.value = dayjs(val).toDate()
})

/** What the text field shows to users */
const formattedDate = computed(() =>
  props.date ? dayjs(props.date).format('DD-MM-YYYY') : ''
)

/** Optional picker limit */
const maxDate = computed(() => dayjs().add(5, 'year').format('YYYY-MM-DD'))

function onPick (val) {
  // Emit API-friendly format
  const ymd = dayjs(val).format('YYYY-MM-DD')
  emit('update:date', ymd)
  emit('changed')
  menu.value = false
}
</script>
