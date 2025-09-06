<template>
  <v-dialog v-model="model" max-width="640">
    <v-card class="rounded-2xl">
      <v-card-title class="text-h6 font-weight-bold">✏️ Edit Attendance</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="6"><v-text-field v-model="form.fullName" label="Full Name" readonly /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="form.employeeId" label="Employee ID" readonly /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="form.date" label="Date" readonly /></v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.status" :items="['OnTime','Late','Absent','Leave']" label="Status" />
          </v-col>
          <v-col cols="12" v-if="form.status === 'Leave'">
            <v-text-field v-model="form.leaveType" label="Type of Leave" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.riskStatus"
              :items="['None','NearlyAbandon','Abandon','Risk']"
              label="Risk Status"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model.number="form.overtimeHours" type="number" label="Overtime Hours" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="form.note" label="Note" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="model = false">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="onSave">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  modelValue: Boolean,
  loading: Boolean,
  value: { type: Object, required: true }
})
const emit = defineEmits(['update:modelValue','save'])

const model = computed({
  get:()=>props.modelValue,
  set:(v)=>emit('update:modelValue', v)
})
const form = computed(()=>props.value)

const onSave = () => {
  const payload = {
    status: form.value.status,
    leaveType: form.value.status === 'Leave' ? form.value.leaveType : '',
    riskStatus: form.value.riskStatus || 'None',
    overtimeHours: form.value.overtimeHours || 0,
    note: form.value.note || ''
  }
  emit('save', payload)
}
</script>
