<template>
  <v-card class="pa-4 mb-4 rounded-xl elevation-1">
    <div class="d-flex align-center justify-space-between mb-3">
      <h3 class="text-h6 font-weight-bold">Attendance Overview ({{ titleMonth }})</h3>
      <div class="legend">
        <span class="dot working"></span> Working
        <span class="dot missing"></span> Missing Import
        <span class="dot holiday"></span> Holiday
        <span class="dot sunday"></span> Sunday
      </div>
    </div>

    <div class="grid">
      <div v-for="(week, wi) in weeks" :key="wi" class="week">
        <div
          v-for="day in week"
          :key="day.key"
          class="cell"
          :class="{ blank: day.status === 'blank' }"
          :title="day.tooltip"
        >
          <span :class="['dot', day.status]"></span>
          <small class="d-block text-center day-label">{{ day.d }}</small>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from '@/plugins/dayjs'
import axios from '@/utils/axios'

const props = defineProps({
  // pass 'YYYY-MM-DD' (your selectedDate)
  date: { type: String, required: true }
})

const dots = ref([]) // [{ date:'YYYY-MM-DD', status:'working|missing|holiday|sunday', count:n }]

const month = computed(() => dayjs(props.date).month() + 1) // 1..12
const year  = computed(() => dayjs(props.date).year())
const titleMonth = computed(() => dayjs(props.date).format('MMMM YYYY'))

async function fetchDots () {
  const { data } = await axios.get('/attendance/dots', {
    params: { year: year.value, month: month.value }
  })
  dots.value = data?.dots || []
}

const weeks = computed(() => {
  const start = dayjs(`${year.value}-${String(month.value).padStart(2, '0')}-01`)
  const dayObjects = dots.value.map(d => ({
    date: d.date,
    status: d.status,
    count: d.count,
    d: dayjs(d.date).date(),        // day of month
    key: d.date,
    tooltip: `${d.date} • ${d.status}${d.count ? ` • ${d.count} records` : ''}`
  }))

  // Monday-first column like GitHub
  const firstDowMon0 = (start.day() + 6) % 7
  const blanks = Array.from({ length: firstDowMon0 }, (_, i) => ({
    date: null, status: 'blank', count: 0, d: '', key: `blank-${i}`, tooltip: ''
  }))

  const cells = [...blanks, ...dayObjects]
  const w = []
  for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7))
  return w
})

watch(() => props.date, fetchDots, { immediate: true })
onMounted(fetchDots)
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 44px; }
.day-label { color: #6b7280; font-size: 11px; }
.legend { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6b7280; }
.legend .dot { margin-right: 4px; vertical-align: middle; }

.dot { width: 14px; height: 14px; border-radius: 3px; display: inline-block; border: 1px solid rgba(0,0,0,0.05); }
.dot.working { background: #86efac; }     /* green-300 */
.dot.missing { background: #fde68a; }     /* amber-200 */
.dot.holiday { background: #fca5a5; }     /* red-300 */
.dot.sunday  { background: #93c5fd; }     /* blue-300 */
.dot.blank   { background: transparent; border: 1px dashed #e5e7eb; }
.cell.blank .day-label { visibility: hidden; }
</style>
