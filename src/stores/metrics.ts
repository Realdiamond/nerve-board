import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { MetricCardData } from '@/types/chart'

export const useMetricsStore = defineStore('metrics', () => {
  // Keyed by metric id — derived from market store in P3 composables
  const metrics = shallowRef<Map<string, MetricCardData>>(new Map())

  function setMetric(data: MetricCardData): void {
    const next = new Map(metrics.value)
    next.set(data.id, data)
    metrics.value = next
  }

  return { metrics, setMetric }
})
