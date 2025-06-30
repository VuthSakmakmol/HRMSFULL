import { reactive } from 'vue'

export const dashboardData = reactive({
  pipeline: {},
  sources: { labels: [], counts: [] },
  decisions: { labels: [], counts: [] },
  kpi: {},
  monthly: { labels: [], counts: [] },
  roadmap: {
    roadmapHC: Array(12).fill(0),
    actualHC: Array(12).fill(0),
    hiringTargetHC: Array(12).fill(0)
  }
})
