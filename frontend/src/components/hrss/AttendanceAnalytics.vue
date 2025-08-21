<template>
  <v-card class="rounded-2xl elevation-1">
    <v-toolbar density="comfortable" color="primary" class="rounded-t-2xl">
      <v-toolbar-title>Attendance Analytics</v-toolbar-title>
      <template #append>
        <v-chip class="mr-2" color="white" text-color="primary" variant="flat" v-if="totals">
          Total: {{ totalsCount.toLocaleString() }}
        </v-chip>

        <v-btn variant="flat" color="white" :loading="loading" @click="load">
          <v-icon start>mdi-refresh</v-icon> Refresh
        </v-btn>
      </template>
    </v-toolbar>

    <div class="pa-4">
      <v-row dense class="mb-2">
        <!-- Scope -->
        <v-col cols="12" md="3">
          <v-btn-toggle v-model="scope" mandatory rounded="xl" divided class="w-100">
            <v-btn value="day">Day</v-btn>
            <v-btn value="month">Month</v-btn>
            <v-btn value="year">Year</v-btn>
          </v-btn-toggle>
        </v-col>

        <!-- Date controls -->
        <v-col cols="12" md="3" v-if="scope==='day'">
          <v-menu v-model="dayMenu" :close-on-content-click="false">
            <template #activator="{ props }">
              <v-text-field v-bind="props" v-model="dateStr" label="Date" variant="outlined" density="compact" readonly />
            </template>
            <v-date-picker v-model="dateModel" @update:model-value="onPickDay" />
          </v-menu>
        </v-col>

        <v-col cols="6" md="2" v-if="scope!=='day'">
          <v-text-field
            v-model.number="year"
            label="Year"
            type="number"
            min="2000"
            :max="2100"
            variant="outlined"
            density="compact"
          />
        </v-col>
        <v-col cols="6" md="2" v-if="scope==='month'">
          <v-select
            v-model.number="month"
            :items="[1,2,3,4,5,6,7,8,9,10,11,12]"
            label="Month"
            variant="outlined"
            density="compact"
          />
        </v-col>

        <!-- Shift filter -->
        <v-col cols="12" md="3">
          <v-select
            v-model="localShift"
            :items="['All','Day Shift','Night Shift']"
            label="Shift"
            variant="outlined"
            density="compact"
          />
        </v-col>
      </v-row>

      <!-- Charts -->
      <v-row dense>
        <v-col cols="12">
          <v-card variant="outlined" class="rounded-2xl">
            <v-card-title class="text-subtitle-1 font-weight-medium">Attendance Outcome</v-card-title>
            <v-card-text>
              <apexchart
                v-if="seriesOutcome.length"
                type="bar"
                height="320"
                :options="optionsOutcome"
                :series="seriesOutcome"
              />
              <v-skeleton-loader v-else-if="loading" type="image" />
              <div v-else class="text-medium-emphasis text-center py-6">No data</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="outlined" class="rounded-2xl">
            <v-card-title class="text-subtitle-1 font-weight-medium">Risk Flags</v-card-title>
            <v-card-text>
              <apexchart
                v-if="seriesRisk.length"
                type="line"
                height="300"
                :options="optionsRisk"
                :series="seriesRisk"
              />
              <v-skeleton-loader v-else-if="loading" type="image" />
              <div v-else class="text-medium-emphasis text-center py-6">No data</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="outlined" class="rounded-2xl">
            <v-card-title class="text-subtitle-1 font-weight-medium">Leave Breakdown</v-card-title>
            <v-card-text>
              <apexchart
                v-if="seriesLeave.length"
                type="bar"
                height="300"
                :options="optionsLeave"
                :series="seriesLeave"
              />
              <v-skeleton-loader v-else-if="loading" type="image" />
              <div v-else class="text-medium-emphasis text-center py-6">No data</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from '@/plugins/dayjs'
import axios from '@/utils/axios'

/**
 * Props allow the parent to pass current filters.
 * - modelValueDate: 'YYYY-MM-DD'
 * - modelValueShift: 'All' | 'Day Shift' | 'Night Shift'
 */
const props = defineProps({
  modelValueDate: { type: String, required: true },
  modelValueShift: { type: String, default: 'All' },
})
const emit = defineEmits(['update:modelValueDate', 'update:modelValueShift'])

/* ====== Controls ====== */
const scope = ref('day') // 'day' | 'month' | 'year'
const localShift = ref(props.modelValueShift)
watch(localShift, v => emit('update:modelValueShift', v))

// Day
const dayMenu = ref(false)
const dateModel = ref(props.modelValueDate)
watch(() => props.modelValueDate, v => { dateModel.value = v })
const dateStr = computed(() => dayjs(dateModel.value).format('YYYY-MM-DD'))
const onPickDay = (v) => {
  dayMenu.value = false
  emit('update:modelValueDate', dayjs(v).format('YYYY-MM-DD'))
  load()
}

// Month / Year
const now = dayjs()
const year = ref(Number(now.format('YYYY')))
const month = ref(Number(now.format('MM')))

/* ====== Data ====== */
const loading = ref(false)
const rawLabels = ref([]) // untouched from API

const seriesOutcome = ref([]) // OnTime/Late/Absent/Leave/None
const seriesRisk = ref([])    // NearlyAbandon/Abandon/Risk/None
const seriesLeave = ref([])   // Sick/Annual/Maternity/Unpaid/Special/Other

const totals = ref(null)
const totalsCount = computed(() => {
  if (!totals.value) return 0
  const { status } = totals.value
  return (status.OnTime||0)+ (status.Late||0)+ (status.Absent||0)+ (status.Leave||0)+ (status.None||0)
})

/* ====== Label formatting ====== */
const MONTHS_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const displayLabels = computed(() => {
  const toMonthName = (m) => {
    const n = Number(m)
    return n >= 1 && n <= 12 ? MONTHS_ABBR[n - 1] : String(m)
  }

  if (scope.value === 'year') {
    // Inputs could be 1..12, 'YYYY-MM', 'YYYY-MM-DD', etc.
    return rawLabels.value.map((key) => {
      const s = String(key)
      if (/^\d{1,2}$/.test(s)) return toMonthName(s)
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) return toMonthName(s.slice(5, 7))
      const d = dayjs(s)
      return d.isValid() ? MONTHS_ABBR[d.month()] : s
    })
  }

  if (scope.value === 'month') {
    // Show only day-of-month (01..31), no 'YYYY-MM-DD'
    return rawLabels.value.map((key) => {
      const s = String(key)
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(8, 10)
      if (/^\d{1,2}$/.test(s)) return s.padStart(2, '0')
      const d = dayjs(s)
      if (d.isValid()) return d.format('DD')
      // If backend accidentally returns month numbers here, show month names
      if (/^\d{1,2}$/.test(s)) return toMonthName(s)
      return s
    })
  }

  // scope === 'day' – keep HH:mm if datetime detected; otherwise as-is
  return rawLabels.value.map((key) => {
    const s = String(key)
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(s)) {
      const d = dayjs(s)
      return d.isValid() ? d.format('HH:mm') : s
    }
    if (/^\d{1,2}$/.test(s)) return s.padStart(2, '0')
    return s
  })
})

/* ====== Chart options ====== */
const baseXAxis = computed(() => ({
  categories: displayLabels.value,
  labels: { rotate: -30, hideOverlappingLabels: true, trim: true },
  tickPlacement: 'on',
}))
const baseTooltip = { shared: true, intersect: false }
const baseLegend  = { position: 'bottom' }

const optionsOutcome = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: baseXAxis.value,
  legend: baseLegend,
  tooltip: baseTooltip,
  plotOptions: { bar: { stacked: true } },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: (v) => Math.round(v) } }
}))

const optionsRisk = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: baseXAxis.value,
  legend: baseLegend,
  tooltip: baseTooltip,
  stroke: { width: 3, curve: 'smooth' },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: (v) => Math.round(v) } }
}))

const optionsLeave = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: baseXAxis.value,
  legend: baseLegend,
  tooltip: baseTooltip,
  plotOptions: { bar: { stacked: true } },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: (v) => Math.round(v) } }
}))

/* ====== Load from API ====== */
async function load() {
  loading.value = true
  try {
    const params = {}
    if (scope.value === 'day') {
      params.scope = 'day'
      params.date = dateStr.value
    } else if (scope.value === 'month') {
      params.scope = 'month'
      params.year  = year.value
      params.month = month.value
    } else {
      params.scope = 'year'
      params.year  = year.value
    }
    if (localShift.value && localShift.value !== 'All') {
      params.shiftType = localShift.value
    }

    const { data } = await axios.get('/attendance/series', { params })
    const buckets = Array.isArray(data?.buckets) ? data.buckets : []

    rawLabels.value = buckets.map(b => b.key)

    // Outcome series
    const outOnTime = buckets.map(b => b.status?.OnTime || 0)
    const outLate   = buckets.map(b => b.status?.Late   || 0)
    const outAbsent = buckets.map(b => b.status?.Absent || 0)
    const outLeave  = buckets.map(b => b.status?.Leave  || 0)
    const outNone   = buckets.map(b => b.status?.None   || 0)
    seriesOutcome.value = [
      { name: 'OnTime', data: outOnTime },
      { name: 'Late', data: outLate },
      { name: 'Absent', data: outAbsent },
      { name: 'Leave', data: outLeave },
      { name: 'None', data: outNone },
    ]

    // Risk series
    const rNearly  = buckets.map(b => b.risk?.NearlyAbandon || 0)
    const rAbandon = buckets.map(b => b.risk?.Abandon       || 0)
    const rRisk    = buckets.map(b => b.risk?.Risk          || 0)
    const rNone    = buckets.map(b => b.risk?.None          || 0)
    seriesRisk.value = [
      { name: 'NearlyAbandon', data: rNearly },
      { name: 'Abandon',       data: rAbandon },
      { name: 'Risk',          data: rRisk },
      { name: 'None',          data: rNone },
    ]

    // Leave series (stacked)
    const lSick      = buckets.map(b => b.leaves?.['Sick Leave']      || 0)
    const lAnnual    = buckets.map(b => b.leaves?.['Annual Leave']    || 0)
    const lMaternity = buckets.map(b => b.leaves?.['Maternity Leave'] || 0)
    const lUnpaid    = buckets.map(b => b.leaves?.['Unpaid Leave']    || 0)
    const lSpecial   = buckets.map(b => b.leaves?.['Special Leave']   || 0)
    const lOther     = buckets.map(b => b.leaves?.['Other']           || 0)
    seriesLeave.value = [
      { name: 'Sick Leave', data: lSick },
      { name: 'Annual Leave', data: lAnnual },
      { name: 'Maternity Leave', data: lMaternity },
      { name: 'Unpaid Leave', data: lUnpaid },
      { name: 'Special Leave', data: lSpecial },
      { name: 'Other', data: lOther },
    ]

    totals.value = data?.totals || null
  } catch (err) {
    console.error('❌ /attendance/series fetch failed', err)
    rawLabels.value = []
    seriesOutcome.value = []
    seriesRisk.value = []
    seriesLeave.value = []
    totals.value = null
  } finally {
    loading.value = false
  }
}

watch(scope, () => load())
watch([() => props.modelValueDate], () => {
  if (scope.value === 'day') load()
})

onMounted(() => {
  // initialize based on parent props
  dateModel.value = props.modelValueDate
  localShift.value = props.modelValueShift || 'All'
  load()
})
</script>
