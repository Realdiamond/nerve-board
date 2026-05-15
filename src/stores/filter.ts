import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChartType } from '@/types/chart'
import { DEFAULT_SYMBOLS } from '@/types/market'
import type { TimeRangeKey } from '@/types/market'

export const useFilterStore = defineStore('filter', () => {
  const selectedSymbols = ref<string[]>([DEFAULT_SYMBOLS[0], DEFAULT_SYMBOLS[1]])
  const activeSymbol = ref<string>(DEFAULT_SYMBOLS[0])
  const timeRange = ref<TimeRangeKey>('live')
  const chartType = ref<ChartType>('line')
  const visibleDatasets = ref<Set<string>>(new Set(DEFAULT_SYMBOLS))

  function setActiveSymbol(symbol: string): void {
    activeSymbol.value = symbol
  }

  function setTimeRange(key: TimeRangeKey): void {
    timeRange.value = key
  }

  function setChartType(type: ChartType): void {
    chartType.value = type
  }

  function toggleDataset(symbol: string): void {
    const next = new Set(visibleDatasets.value)
    next.has(symbol) ? next.delete(symbol) : next.add(symbol)
    visibleDatasets.value = next
  }

  return {
    selectedSymbols, activeSymbol, timeRange, chartType, visibleDatasets,
    setActiveSymbol, setTimeRange, setChartType, toggleDataset,
  }
})
