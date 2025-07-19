<template>
  <div>
    <div
      v-for="cat in categories"
      :key="cat.key"
      class="category-block"
    >
      <h3 class="category-title">{{ cat.title }}</h3>
      <table class="summary-table">
        <thead>
          <tr>
            <th></th>
            <th v-for="m in months" :key="m">
              {{ formatMonth(m) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">Target Budget</td>
            <td v-for="(n,i) in cat.targetBudget" :key="i">{{ n }}</td>
          </tr>
          <tr>
            <td class="row-label">Target Roadmap</td>
            <td v-for="(n,i) in cat.targetRoadmap" :key="i">{{ n }}</td>
          </tr>
          <tr>
            <td class="row-label">Actual</td>
            <td v-for="(n,i) in cat.actual" :key="i">{{ n }}</td>
          </tr>
          <tr>
            <td class="row-label">± Budget</td>
            <td v-for="(n,i) in cat.varianceBudget" :key="i">{{ n }}</td>
          </tr>
          <tr>
            <td class="row-label">± Roadmap</td>
            <td v-for="(n,i) in cat.varianceRoadmap" :key="i">{{ n }}</td>
          </tr>
          <!-- New percentage row -->
          <tr>
            <td class="row-label">% of Budget</td>
            <td
              v-for="(actual,i) in cat.actual"
              :key="i"
            >
              {{ formatPercent(actual, cat.targetBudget[i]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

interface Category {
  key: string
  title: string
  targetBudget: number[]
  targetRoadmap: number[]
  actual: number[]
  varianceBudget: number[]
  varianceRoadmap: number[]
}

const months = ref<string[]>([])
const categories = ref<Category[]>([])

/**
 * Converts "YYYY-MM" → "Mon"
 */
const formatMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('default', { month: 'short' })
}

/**
 * Returns a percentage string of actual/vs budget, rounded to nearest whole.
 * If budget is zero or missing, returns "–".
 */
const formatPercent = (actual: number, budget: number) => {
  if (!budget) return '–'
  return Math.round((actual / budget) * 100) + '%'
}

onMounted(async () => {
  const year = new Date().getFullYear()
  console.log('[SummaryBudgetTable] fetching for year', year)

  try {
    console.log('[SummaryBudgetTable] GET /excome/manpower/targets?year=' + year)
    const { data } = await axios.get('/excome/manpower/targets', {
      params: { year }
    })
    console.log('[SummaryBudgetTable] raw response:', data)

    if (Array.isArray(data.months) && Array.isArray(data.categories)) {
      months.value     = data.months
      categories.value = data.categories
      console.log('[SummaryBudgetTable] months:', months.value)
      console.log('[SummaryBudgetTable] categories:', categories.value)
    } else {
      console.warn('[SummaryBudgetTable] unexpected payload shape', data)
    }
  } catch (err) {
    console.error('[SummaryBudgetTable] error fetching targets', err)
  }
})
</script>

<style scoped>
.category-block {
  margin-bottom: 2rem;
}
.category-title {
  margin: 0 0 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
}
.summary-table {
  width: 100%;
  border-collapse: collapse;
}
.summary-table th,
.summary-table td {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: right;
}
.summary-table th:first-child,
.summary-table td:first-child {
  text-align: left;
  font-weight: 500;
}
.row-label {
  white-space: nowrap;
}
</style>
