<template>
  <v-card class="rounded-2xl elevation-1">
    <!-- Toolbar -->
    <v-toolbar density="comfortable" color="primary" class="rounded-t-2xl">
      <v-toolbar-title>Attendance Analytics</v-toolbar-title>
      <template #append>
        <v-chip
          class="mr-2"
          color="white"
          text-color="primary"
          variant="flat"
          v-if="totals"
        >
          Total: {{ totalsCount.toLocaleString() }}
        </v-chip>

        <v-btn variant="flat" color="white" :loading="loading" @click="load">
          <v-icon start>mdi-refresh</v-icon> Refresh
        </v-btn>
      </template>
    </v-toolbar>

    <div class="pa-4">
      <!-- Filters -->
      <v-row dense class="mb-2">
        <!-- Scope -->
        <v-col cols="12" md="3">
          <v-btn-toggle v-model="scope" mandatory rounded="xl" divided class="w-100">
            <v-btn value="day">Day</v-btn>
            <v-btn value="month">Month</v-btn>
            <v-btn value="year">Year</v-btn>
          </v-btn-toggle>
        </v-col>

        <!-- Date -->
        <v-col cols="12" md="3" v-if="scope === 'day'">
          <v-menu v-model="dayMenu" :close-on-content-click="false">
            <template #activator="{ props }">
              <v-text-field
                v-bind="props"
                v-model="dateStr"
                label="Date"
                variant="outlined"
                density="compact"
                readonly
              />
            </template>
            <v-date-picker v-model="dateModel" @update:model-value="onPickDay" />
          </v-menu>
        </v-col>

        <!-- Year -->
        <v-col cols="6" md="2" v-if="scope !== 'day'">
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

        <!-- Month -->
        <v-col cols="6" md="2" v-if="scope === 'month'">
          <v-select
            v-model.number="month"
            :items="[1,2,3,4,5,6,7,8,9,10,11,12]"
            label="Month"
            variant="outlined"
            density="compact"
          />
        </v-col>

        <!-- Shift Filter -->
        <v-col cols="12" md="3">
          <v-select
            v-model="localShift"
            :items="shiftOptions"
            item-title="label"
            item-value="value"
            label="Shift Template"
            variant="outlined"
            density="compact"
            :loading="loadingShifts"
            clearable
          />
        </v-col>
      </v-row>

      <!-- Charts -->
      <v-row dense>
        <!-- Attendance Outcome -->
        <v-col cols="12">
          <v-card variant="outlined" class="rounded-2xl">
            <v-card-title class="text-subtitle-1 font-weight-medium">
              Attendance Outcome
            </v-card-title>
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

        <!-- Risk -->
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

        <!-- Leave -->
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

/* ───────── Props & Emits ───────── */
const props = defineProps({
  modelValueDate: { type: String, required: true },
  modelValueShift: { type: String, default: 'All' },
})
const emit = defineEmits(['update:modelValueDate', 'update:modelValueShift'])

/* ───────── Controls ───────── */
const scope = ref('day')
const localShift = ref(props.modelValueShift)

watch(localShift, (v) => {
  emit('update:modelValueShift', v)
  load()
})

/* ───────── Date Controls ───────── */
const dayMenu = ref(false)
const dateModel = ref(props.modelValueDate)
watch(() => props.modelValueDate, (v) => { dateModel.value = v })
const dateStr = computed(() => dayjs(dateModel.value).format('YYYY-MM-DD'))

const onPickDay = (v) => {
  dayMenu.value = false
  emit('update:modelValueDate', dayjs(v).format('YYYY-MM-DD'))
  load()
}

/* ───────── Month / Year ───────── */
const now = dayjs()
const year = ref(Number(now.format('YYYY')))
const month = ref(Number(now.format('MM')))

/* ───────── Shift Templates ───────── */
const shiftOptions = ref([{ label: 'All', value: 'All' }])
const loadingShifts = ref(false)

async function loadShifts() {
  try {
    loadingShifts.value = true
    const { data } = await axios.get('/hrss/shift-templates', { params: { active: true } })

    const items = Array.isArray(data)
      ? data.map((s) => ({
          label: s.name || '(Unnamed)',
          value: s._id, // use _id not name
        }))
      : []

    shiftOptions.value = [{ label: 'All', value: 'All' }, ...items]
  } catch (err) {
    console.error('❌ Failed to load shift templates', err)
    shiftOptions.value = [{ label: 'All', value: 'All' }]
  } finally {
    loadingShifts.value = false
  }
}

/* ───────── Data / Charts ───────── */
const loading = ref(false)
const rawLabels = ref([])
const seriesOutcome = ref([])
const seriesRisk = ref([])
const seriesLeave = ref([])
const totals = ref(null)

const totalsCount = computed(() => {
  if (!totals.value) return 0
  const { status } = totals.value
  return Object.values(status).reduce((a, b) => a + (b || 0), 0)
})

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const displayLabels = computed(() => {
  const toMonthName = (m) => {
    const n = Number(m)
    return n >= 1 && n <= 12 ? MONTHS_ABBR[n - 1] : String(m)
  }
  if (scope.value === 'year') {
    return rawLabels.value.map((key) => {
      const s = String(key)
      if (/^\d{1,2}$/.test(s)) return toMonthName(s)
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) return toMonthName(s.slice(5, 7))
      const d = dayjs(s)
      return d.isValid() ? MONTHS_ABBR[d.month()] : s
    })
  }
  if (scope.value === 'month') {
    return rawLabels.value.map((key) => {
      const s = String(key)
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(8, 10)
      if (/^\d{1,2}$/.test(s)) return s.padStart(2, '0')
      const d = dayjs(s)
      return d.isValid() ? d.format('DD') : s
    })
  }
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

const baseXAxis = computed(() => ({
  categories: displayLabels.value,
  labels: { rotate: -30, hideOverlappingLabels: true, trim: true },
  tickPlacement: 'on',
}))
const baseTooltip = { shared: true, intersect: false }
const baseLegend = { position: 'bottom' }

const optionsOutcome = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: baseXAxis.value,
  legend: baseLegend,
  tooltip: baseTooltip,
  plotOptions: { bar: { stacked: true } },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: (v) => Math.round(v) } },
}))
const optionsRisk = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: baseXAxis.value,
  legend: baseLegend,
  tooltip: baseTooltip,
  stroke: { width: 3, curve: 'smooth' },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: (v) => Math.round(v) } },
}))
const optionsLeave = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: baseXAxis.value,
  legend: baseLegend,
  tooltip: baseTooltip,
  plotOptions: { bar: { stacked: true } },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: (v) => Math.round(v) } },
}))

/* ───────── Fetch Analytics ───────── */
async function load() {
  loading.value = true
  try {
    const params = {}
    if (scope.value === 'day') {
      params.scope = 'day'
      params.date = dateStr.value
    } else if (scope.value === 'month') {
      params.scope = 'month'
      params.year = year.value
      params.month = month.value
    } else {
      params.scope = 'year'
      params.year = year.value
    }

    // 🆕 use shiftTemplateId instead of shiftType
    if (localShift.value && localShift.value !== 'All') {
      params.shiftTemplateId = localShift.value
    }

    const { data } = await axios.get('/attendance/series', { params })
    const buckets = Array.isArray(data?.buckets) ? data.buckets : []

    rawLabels.value = buckets.map((b) => b.key)
    seriesOutcome.value = [
      { name: 'OnTime', data: buckets.map((b) => b.status?.OnTime || 0) },
      { name: 'Late', data: buckets.map((b) => b.status?.Late || 0) },
      { name: 'Absent', data: buckets.map((b) => b.status?.Absent || 0) },
      { name: 'Leave', data: buckets.map((b) => b.status?.Leave || 0) },
      { name: 'None', data: buckets.map((b) => b.status?.None || 0) },
    ]
    seriesRisk.value = [
      { name: 'NearlyAbandon', data: buckets.map((b) => b.risk?.NearlyAbandon || 0) },
      { name: 'Abandon', data: buckets.map((b) => b.risk?.Abandon || 0) },
      { name: 'Risk', data: buckets.map((b) => b.risk?.Risk || 0) },
      { name: 'None', data: buckets.map((b) => b.risk?.None || 0) },
    ]
    seriesLeave.value = [
      { name: 'Sick Leave', data: buckets.map((b) => b.leaves?.['Sick Leave'] || 0) },
      { name: 'Annual Leave', data: buckets.map((b) => b.leaves?.['Annual Leave'] || 0) },
      { name: 'Maternity Leave', data: buckets.map((b) => b.leaves?.['Maternity Leave'] || 0) },
      { name: 'Unpaid Leave', data: buckets.map((b) => b.leaves?.['Unpaid Leave'] || 0) },
      { name: 'Special Leave', data: buckets.map((b) => b.leaves?.['Special Leave'] || 0) },
      { name: 'Other', data: buckets.map((b) => b.leaves?.['Other'] || 0) },
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

/* ───────── Lifecycle ───────── */
watch(scope, () => load())
watch([() => props.modelValueDate], () => {
  if (scope.value === 'day') load()
})

onMounted(async () => {
  await loadShifts()
  dateModel.value = props.modelValueDate
  localShift.value = props.modelValueShift || 'All'
  await load()
})
</script>
