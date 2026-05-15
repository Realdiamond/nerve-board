// ─── useChartSeries ───────────────────────────────────────────────────────────
// Derived State Layer: transforms store candle/trade data into ECharts-ready
// series format. This is the bridge between raw store data and chart components.
//
// Time range filtering is applied here — works identically for both mock and
// live modes since both adapters emit CandleDTO with openTime timestamps.

import { computed } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useFilterStore } from '@/stores/filter'
import { TIME_RANGES } from '@/types/market'

export function useChartSeries() {
  const marketStore = useMarketStore()
  const filterStore = useFilterStore()

  // ── Shared: resolve durationMs for the active time range ──────────────────
  // 'live' → durationMs === 0 → no filtering (show all accumulated candles)

  const durationMs = computed(() => {
    const range = TIME_RANGES.find(r => r.key === filterStore.timeRange)
    return range?.durationMs ?? 0
  })

  // ── Shared: filter candles to the active time window ──────────────────────

  function filterCandles<T extends { openTime: number }>(candles: T[]): T[] {
    const ms = durationMs.value
    if (ms === 0) return candles                          // 'live' → all candles
    const cutoff = Date.now() - ms
    return candles.filter(c => c.openTime >= cutoff)
  }

  // ── Line / Area series (close prices over time) ────────────────────────────

  const lineSeries = computed(() => {
    const sym = filterStore.activeSymbol
    const candles = filterCandles(marketStore.getCandles(sym))

    return candles.map(c => ([c.openTime, c.close] as [number, number]))
  })

  // ── Bar series (volume over time) ──────────────────────────────────────────

  const barSeries = computed(() => {
    const sym = filterStore.activeSymbol
    const candles = filterCandles(marketStore.getCandles(sym))

    return candles.map(c => ({
      value: [c.openTime, c.volume] as [number, number],
      itemStyle: {
        color: c.close >= c.open
          ? 'rgba(16, 185, 129, 0.6)'   // green
          : 'rgba(239, 68, 68, 0.6)',    // red
      },
    }))
  })

  // ── Candlestick series (OHLC) ─────────────────────────────────────────────

  const candlestickSeries = computed(() => {
    const sym = filterStore.activeSymbol
    const candles = filterCandles(marketStore.getCandles(sym))

    // ECharts candlestick: [open, close, low, high]
    return {
      categoryData: candles.map(c => c.openTime),
      values: candles.map(c => [c.open, c.close, c.low, c.high] as [number, number, number, number]),
    }
  })

  // ── Shared axis config ─────────────────────────────────────────────────────

  const xAxisTimeConfig = computed(() => ({
    type: 'time' as const,
    splitLine: { show: false },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    axisLabel: {
      fontSize: 10,
      formatter: (value: number) => {
        const d = new Date(value)
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      },
    },
  }))

  return { lineSeries, barSeries, candlestickSeries, xAxisTimeConfig }
}
