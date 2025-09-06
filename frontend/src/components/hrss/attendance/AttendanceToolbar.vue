<template>
  <v-toolbar color="primary" density="comfortable" class="rounded-t-2xl" title="Attendance Record">
    <template #append>
      <div v-if="importProg?.active" class="d-flex align-center mr-2" style="gap:8px;">
        <v-progress-circular indeterminate size="18" width="2" color="white" />
        <v-chip density="comfortable" color="white" text-color="primary" variant="flat">
          {{ importProg.sent.toLocaleString() }} / {{ importProg.total.toLocaleString() }} ({{ pct }}%)
        </v-chip>
      </div>

      <v-btn variant="flat" color="white" class="mr-2" @click="$emit('refresh')">
        <v-icon start>mdi-refresh</v-icon> Refresh
      </v-btn>

      <v-btn variant="flat" color="white" class="mr-2" @click="$emit('open-calendar')">
        <v-icon start>mdi-calendar-cog</v-icon> Customize Calendar
      </v-btn>

      <v-file-input
        v-model="file"
        accept=".xlsx"
        hide-details
        density="comfortable"
        style="max-width:260px"
        variant="solo"
        prepend-icon="mdi-upload"
        placeholder="Select Excel"
        @update:model-value="onPicked"
      />
      <v-btn color="success" class="ml-2" :disabled="!file" @click="emitImport">
        <v-icon start>mdi-database-import</v-icon> Import
      </v-btn>
    </template>
  </v-toolbar>
</template>

<script setup>
import { ref, computed } from 'vue'
const props = defineProps({ importProg: Object })
const emit = defineEmits(['refresh','open-calendar','import'])

const file = ref(null)
const pct = computed(() => props.importProg?.total ? Math.round((props.importProg.sent / props.importProg.total) * 100) : 0)

const onPicked = () => {}
const emitImport = () => {
  const f = Array.isArray(file.value) ? file.value[0] : file.value
  if (f) emit('import', f)
}
</script>
