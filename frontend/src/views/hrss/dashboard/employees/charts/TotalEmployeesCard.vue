<template>
  <v-col cols="12" sm="6">
    <v-card flat class="pa-4 rounded-lg" style="background:#f7f9fc; height:100%">
      <v-row align-center="center" justify="space-between">
        <div>
          <div class="text-subtitle-2 font-weight-medium d-flex align-center mb-1">
            <v-icon start color="purple" size="20">mdi-account-group</v-icon>
            Total Employees
          </div>
          <div class="text-h5 font-weight-bold text-primary">{{ total }}</div>
        </div>
      </v-row>
    </v-card>
  </v-col>
</template>

<script setup>


const props = defineProps({
  total: Number,
  trend: {
    type: Array,
    default: () => []
  }
})

</script>
