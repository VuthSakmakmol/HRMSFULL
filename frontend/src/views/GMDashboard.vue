<template>
  <v-container class="d-flex align-center justify-center" fluid style="min-height: 80vh">
    <v-card class="pa-8 text-center" elevation="2" style="max-width: 600px">
      <v-icon color="primary" size="80">mdi-progress-clock</v-icon>

      <h2 class="mt-4 font-weight-bold text-primary">General Manager Dashboard</h2>

      <p class="text-grey-darken-1 text-body-1 mt-2">
        This dashboard is currently <strong>pending</strong> and will be available soon after all feature data is completed.
      </p>

      <p class="text-grey-darken-2 text-body-2 mt-2">
        You can explore all available features and modules from the sidebar on the left.
      </p>

      <v-divider class="my-4" />

      <v-btn color="primary" variant="outlined" @click="$router.push('/ta/dashboard')">
        <v-icon start>mdi-arrow-left</v-icon>
        Back to TA Dashboard
      </v-btn>

    </v-card>
  </v-container>
</template>

<script setup>
</script>
