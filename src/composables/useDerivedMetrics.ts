// ─── useDerivedMetrics ────────────────────────────────────────────────────────
// Derived State Layer: transforms raw market store data into MetricCardData.
// This is the explicit "Layer 2.5" from the architecture.
// Components consume this — never the raw store directly.

import { computed } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useFilterStore } from '@/stores/filter'
import type { MetricCardData } from '@/types/chart'

export function useDerivedMetrics() {
  const marketStore = useMarketStore()
  const filterStore = useFilterStore()

  // ── Per-symbol metrics for the active symbol ──────────────────────────────

  const activeMetrics = computed<MetricCardData[]>(() => {
    const sym = filterStore.activeSymbol
    const ticker = marketStore.getTicker(sym)

    if (!ticker) {
      return [
        { id: 'price',   label: 'Last Price',   value: 0, format: 'currency' },
        { id: 'change',  label: '24h Change',   value: 0, format: 'percent' },
        { id: 'high',    label: '24h High',     value: 0, format: 'currency' },
        { id: 'low',     label: '24h Low',      value: 0, format: 'currency' },
        { id: 'volume',  label: 'Volume (24h)', value: 0, format: 'volume' },
        { id: 'qvolume', label: 'Quote Volume', value: 0, format: 'volume' },
      ]
    }

    const changePct = ticker.priceChangePercent

    return [
      {
        id: 'price',
        label: 'Last Price',
        value: ticker.lastPrice,
        previousValue: ticker.lastPrice - ticker.priceChange,
        format: 'currency',
        trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
      },
      {
        id: 'change',
        label: '24h Change',
        value: changePct,
        format: 'percent',
        trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
      },
      {
        id: 'high',
        label: '24h High',
        value: ticker.highPrice,
        format: 'currency',
        trend: 'up',
      },
      {
        id: 'low',
        label: '24h Low',
        value: ticker.lowPrice,
        format: 'currency',
        trend: 'down',
      },
      {
        id: 'volume',
        label: 'Volume (24h)',
        value: ticker.volume,
        format: 'volume',
      },
      {
        id: 'qvolume',
        label: 'Quote Volume',
        value: ticker.quoteVolume,
        format: 'volume',
      },
    ]
  })

  // ── All-symbol ticker summary (for multi-symbol overview) ─────────────────

  const tickerSummary = computed(() => {
    return Array.from(marketStore.tickers.entries()).map(([symbol, ticker]) => ({
      symbol,
      lastPrice: ticker.lastPrice,
      priceChangePercent: ticker.priceChangePercent,
      trend: ticker.priceChangePercent > 0 ? 'up'
           : ticker.priceChangePercent < 0 ? 'down'
           : 'flat',
    }))
  })

  return { activeMetrics, tickerSummary }
}
