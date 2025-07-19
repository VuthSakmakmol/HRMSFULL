<template>
  <v-card flat class="pa-0 rounded-lg elevation-2">
    <v-card-title class="px-4 py-2 text-subtitle-2 font-weight-medium d-flex align-center">
      <v-icon start color="pink" size="20">mdi-table-large</v-icon>
      <span class="ml-2">{{ title }}</span>
    </v-card-title>
    <v-card-text class="px-0 pb-4">
      <div class="table-responsive">
        <table class="comparison-table">
          <thead>
            <tr>
              <th class="header-cell">Category</th>
              <th
                v-for="(month, idx) in months"
                :key="month"
                class="header-cell"
              >
                {{ displayLabels[idx] }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in items"
              :key="row.category"
              class="body-row"
            >
              <td class="body-cell font-weight-medium">{{ row.category }}</td>
              <td
                v-for="month in months"
                :key="month"
                class="body-cell"
              >{{ row[month] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title:  { type: String, required: true },
  months: { type: Array,  required: true }, // [ '2025-01', '2025-02', … ]
  items:  { type: Array,  required: true }  // [ { category:'…', '2025-01':n, … }, … ]
})

// map 'YYYY-MM' → 'Jan', 'Feb', etc.
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const displayLabels = computed(() =>
  props.months.map(m => {
    const parts = m.split('-')
    const mm = parseInt(parts[1], 10)
    return monthNames[mm - 1] || m
  })
)
</script>

<style scoped>
.table-responsive {
  overflow-x: auto;
}
.comparison-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 600px;
}
.comparison-table thead {
  background-color: #fafafa;
}
.header-cell {
  padding: 12px 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
  border-bottom: 2px solid rgba(0, 0, 0, 0.12);
  white-space: nowrap;
}
.body-cell {
  padding: 12px 16px;
  color: rgba(0, 0, 0, 0.75);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}
.body-row:nth-child(odd) {
  background-color: #fcfcfc;
}
.body-row:hover {
  background-color: #f0f0f0;
}
.v-card {
  overflow: hidden;
}
</style>
