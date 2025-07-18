<template>
  <v-container fluid class="pa-4">
    <h2>Employee Dashboard</h2>

    <!-- GLOBAL FILTERS -->
    <v-row class="mb-6" dense>
      <v-col cols="12" sm="4">
        <v-select
          v-model="selectedPeriod"
          :items="periodOptions"
          item-title="text"
          item-value="value"
          label="Period"
          dense
          hide-details
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" sm="4" v-if="selectedPeriod !== 'all'">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Year"
          dense
          hide-details
          variant="outlined"
        />
      </v-col>
    </v-row>

    <v-row dense>
      <!-- Total Employees -->
      <v-col cols="12" sm="4">
        <TotalEmployeesCard
          :total="summary.total"
          :trend="summary.trend"
        />
      </v-col>

      <!-- Join Trends -->
      <v-col cols="12" sm="4">
        <MonthlyJoinChart :chart-data="monthlyProcessed" />
      </v-col>

      <!-- Sewer & Jumper Comparison -->
      <v-col cols="12" sm="4">
        <PositionCountChart :chart-data="positionProcessed" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from '@/utils/axios';

import TotalEmployeesCard   from './charts/TotalEmployeesCard.vue';
import MonthlyJoinChart     from './charts/MonthlyJoinChart.vue';
import PositionCountChart   from './charts/PositionCountChart.vue';

// ─── RAW DATA ──────────────────────────────────────────────────────
const summary         = ref({ total: 0, trend: [] });
const monthlyRaw      = ref({ labels: [], counts: [] });
const positionRaw     = ref({ labels: [], sewer: [], jumper: [], combined: [] });

// ─── GLOBAL FILTER STATE ──────────────────────────────────────────
const periodOptions   = [
  { text: 'All',       value: 'all'      },
  { text: 'Yearly',    value: 'yearly'   },
  { text: 'Quarterly', value: 'quarterly'}
];
const selectedPeriod  = ref('all');
const selectedYear    = ref(null);
watch(selectedPeriod, () => (selectedYear.value = null));

// derive years from monthly labels
const yearOptions = computed(() => {
  const yrs = new Set(monthlyRaw.value.labels.map(l => l.slice(0,4)));
  return Array.from(yrs).sort();
});

// ─── FETCH ALL DASHBOARD DATA ────────────────────────────────────
onMounted(async () => {
  const company = localStorage.getItem('company');
  if (!company) return;

  // 1) summary
  try {
    const { data } = await axios.get('/hrss/dashboard/employees', { params:{ company }});
    summary.value = {
      total: data.total || 0,
      trend: data.trend || []
    };
  } catch {}

  // 2) joins
  try {
    const { data } = await axios.get('/hrss/dashboard/employees/monthly', { params:{ company }});
    monthlyRaw.value = {
      labels: data.map(r => r._id),
      counts: data.map(r => r.count)
    };
  } catch {}


  // 🎯 Sewer & Jumper Monthly
try {
  const { data } = await axios.get(
    '/hrss/dashboard/employees/positions/monthly',
    { params: { company } }
  );
  console.log('position monthly raw:', data);
    positionRaw.value = {
      labels:   data.labels,
      sewer:    data.sewer,
      jumper:   data.jumper,
      combined: data.combined
    };
  } catch (err) {
    console.error('❌ Failed to fetch position-monthly:', err);
  }

});

// ─── PROCESS & FILTER ────────────────────────────────────────────
// helper to zip raw into objects
const rawJoins = computed(() =>
  monthlyRaw.value.labels.map((lbl,i) => ({
    date: lbl,
    count: monthlyRaw.value.counts[i] || 0
  }))
);

const monthlyProcessed = computed(() => {
  if (selectedPeriod.value === 'all') {
    return { ...monthlyRaw.value };
  }
  if (selectedPeriod.value === 'yearly') {
    if (!selectedYear.value) return { labels:[], counts:[] };
    const y = selectedYear.value;
    const months = Array.from({ length: 12 }, (_, i) =>
      `${y}-${String(i+1).padStart(2,'0')}`
    );
    const counts = months.map(m => {
      const f = rawJoins.value.find(r => r.date === m);
      return f ? f.count : 0;
    });
    return { labels: months, counts };
  }
  if (selectedPeriod.value === 'quarterly') {
    if (!selectedYear.value) return { labels:[], counts:[] };
    const y = selectedYear.value;
    const sums = [0,0,0,0];
    rawJoins.value.forEach(r => {
      if (r.date.startsWith(y)) {
        const m = +r.date.slice(5,7);
        sums[Math.ceil(m/3)-1] += r.count;
      }
    });
    return { labels:['Q1','Q2','Q3','Q4'], counts: sums };
  }
  return { labels:[], counts:[] };
});

// same exact filter logic for positionRaw
const rawPos = computed(() =>
  positionRaw.value.labels.map((lbl,i) => ({
    date:     lbl,
    sewer:    positionRaw.value.sewer[i]    || 0,
    jumper:   positionRaw.value.jumper[i]   || 0,
    combined: positionRaw.value.combined[i] || 0
  }))
);

const positionProcessed = computed(() => {
  // ALL
  if (selectedPeriod.value === 'all') {
    return { ...positionRaw.value };
  }
  // YEARLY
  if (selectedPeriod.value === 'yearly') {
    if (!selectedYear.value) return { labels:[], sewer:[], jumper:[], combined:[] };
    const y = selectedYear.value;
    const months = Array.from({ length: 12 }, (_, i) =>
      `${y}-${String(i+1).padStart(2,'0')}`
    );
    const s = months.map(m => rawPos.value.find(r=>r.date===m)?.sewer  || 0);
    const j = months.map(m => rawPos.value.find(r=>r.date===m)?.jumper || 0);
    const c = s.map((v,i) => v + j[i]);
    return { labels: months, sewer: s, jumper: j, combined: c };
  }
  // QUARTERLY
  if (selectedPeriod.value === 'quarterly') {
    if (!selectedYear.value) return { labels:[], sewer:[], jumper:[], combined:[] };
    const y = selectedYear.value;
    const sums = { sewer:[0,0,0,0], jumper:[0,0,0,0], combined:[0,0,0,0] };
    rawPos.value.forEach(r => {
      if (r.date.startsWith(y)) {
        const m = +r.date.slice(5,7), qi = Math.ceil(m/3)-1;
        sums.sewer[qi]    += r.sewer;
        sums.jumper[qi]   += r.jumper;
        sums.combined[qi] += r.combined;
      }
    });
    return {
      labels:   ['Q1','Q2','Q3','Q4'],
      sewer:    sums.sewer,
      jumper:   sums.jumper,
      combined: sums.combined
    };
  }
  return { labels:[], sewer:[], jumper:[], combined:[] };
});
</script>
