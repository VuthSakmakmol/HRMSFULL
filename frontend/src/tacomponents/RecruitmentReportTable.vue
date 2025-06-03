<template>
  <div class="report-wrapper">
    <table class="report-table">
      <thead>
        <tr>
          <th class="sticky-col sticky-head">Performance</th>
          <th v-for="col in dynamicColumns" :key="col" class="sticky-head">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in reportData"
          :key="index"
          :class="{ 'section-header': row.isHeader }"
        >
          <td class="sticky-col">{{ row.label }}</td>
          <td v-for="(val, i) in row.values" :key="i">
            <template v-if="row.isSource">
              <div class="bar-wrapper">
                <div
                  v-if="parseFloat(row.percents[i]) > 0"
                  class="bar-fill"
                  :class="getBarClass(row.percents[i])"
                  :style="{ width: row.percents[i].replace('%', '') + '%' }"
                ></div>
                <span class="bar-label">{{ row.percents[i] }}</span>
              </div>
            </template>
            <template v-else>
              {{ val }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/utils/axios'

const props = defineProps({
  type: String,
  subType: String,
  view: String,        // 'month' | 'quarter' | 'year'
  year: Number,
  quarter: Number,
  month: Number
})

const reportData = ref([])
const dynamicColumns = ref([])

const fetchReport = async () => {
  try {
    const res = await api.get('/report', {
      params: {
        type: props.type,
        subType: props.subType,
        view: props.view,
        year: props.year,
        quarter: props.quarter,
        month: props.month
      }
    })
    reportData.value = res.data.rows
    dynamicColumns.value = res.data.columns
  } catch (err) {
    console.error('❌ Report fetch failed:', err)
  }
}

watch(
  () => [props.type, props.subType, props.view, props.year, props.quarter, props.month],
  fetchReport,
  { immediate: true }
)

const getBarClass = (percent) => {
  const value = parseFloat(percent)
  if (value >= 90) return 'bar-color-10'
  if (value >= 80) return 'bar-color-9'
  if (value >= 70) return 'bar-color-8'
  if (value >= 60) return 'bar-color-7'
  if (value >= 50) return 'bar-color-6'
  if (value >= 40) return 'bar-color-5'
  if (value >= 30) return 'bar-color-4'
  if (value >= 20) return 'bar-color-3'
  if (value >= 10) return 'bar-color-2'
  return 'bar-color-1'
}
</script>

<style scoped>
.report-wrapper {
  width: 100%;
  max-height: 70vh;
  overflow-x: auto;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.report-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
}

.report-table th,
.report-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

.sticky-head {
  position: sticky;
  top: 0;
  background-color: #e3f2fd;
  z-index: 5;
  font-weight: bold;
  color: #1565c0;
}

.sticky-col {
  position: sticky;
  left: 0;
  background-color: #f1f8e9;
  z-index: 4;
  font-weight: bold;
  color: #558b2f;
  text-align: left;
}

.section-header td {
  background-color: #eee;
  font-weight: bold;
  color: #444;
  text-align: left;
}

.bar-wrapper {
  position: relative;
  height: 24px;
  line-height: 24px;
  border-radius: 2px;
  background-color: #e4dddd;
  overflow: hidden;
}

.bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 2px;
  z-index: 1;
  max-width: 100%;
  transition: width 0.3s ease;
}

.bar-label {
  position: relative;
  z-index: 2;
  color: black;
  font-size: 13px;
  display: inline-block;
  padding: 0 6px;
}

/* 🔟 10 Customizable Bar Color Classes */
.bar-color-1  { background-color: #d32f2f; }
.bar-color-2  { background-color: #cd6261; }
.bar-color-3  { background-color: #e7a46d; }
.bar-color-4  { background-color: #fb8c00; }
.bar-color-5  { background-color: #fbc02d; }
.bar-color-6  { background-color: #c0ca33; }
.bar-color-7  { background-color: #9ccc65; }
.bar-color-8  { background-color: #7cb342; }
.bar-color-9  { background-color: #43a047; }
.bar-color-10 { background-color: #2e7d32; }
</style>
