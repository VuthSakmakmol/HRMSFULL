<template>
  <v-card>
    <v-card-title>
      Department &amp; Position Breakdown
      <v-spacer />
      <v-select
        v-model="filterStatus"
        :items="statusOptions"
        dense
        hide-details
        style="max-width: 150px"
        label="Status"
      />
    </v-card-title>

    <v-card-text>
      <apexchart
        type="bar"
        :options="chartOptions"
        :series="chartSeries"
        height="350"
      />
    </v-card-text>
  </v-card>
</template>

<script>
import { defineComponent, ref, watch, onMounted } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

export default defineComponent({
  name: 'DepartmentPositionStatusChart',
  components: { apexchart: VueApexCharts },
  props: {
    statusOptions:  { type: Array,  required: true },
    initialStatus:  { type: String, required: true },
    fetchData:      { type: Function, required: true },
  },
  setup(props) {
    const filterStatus  = ref(props.initialStatus)
    const chartSeries   = ref([{ name: filterStatus.value, data: [] }])
    const chartOptions  = ref({
      chart: {
        id: 'dept-pos-status',
        toolbar: { show: false }
      },
      xaxis: { categories: [] },
      plotOptions: {
        bar: { horizontal: false, columnWidth: '60%' }
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { y: { formatter: val => val.toString() } }
    })

    // load / reload the chart whenever the status filter changes
    async function load() {
      // call your passed-in fetch function
      const raw = await props.fetchData(filterStatus.value)
      const categories = raw.map(r => `${r.department} / ${r.position}`)
      const data       = raw.map(r => r.count)

      chartOptions.value.xaxis.categories = categories
      chartSeries.value = [{ name: filterStatus.value, data }]
    }

    watch(filterStatus, load, { immediate: true })
    onMounted(load)

    return { filterStatus, chartOptions, chartSeries }
  }
})
</script>
