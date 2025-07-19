<template>
  <v-card class="pa-4 text-center">
    <div class="text-subtitle-1 mb-2">{{ title }}</div>
    <div class="text-h3 font-weight-bold">{{ count }}</div>
  </v-card>
</template>

<script>
export default {
  name: 'TypeOfPosition',
  props: {
    title: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      required: true
    }
  }
}
</script>

<style scoped>
.text-subtitle-1 {
  color: #555;
}
</style>
