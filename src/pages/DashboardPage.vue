<template>
  <AppShell>
    <DashboardGrid>
      <!-- Metrics row — P6 ✓ -->
      <template #metrics>
        <MetricsRow />
      </template>

      <!-- Charts — P7+P9+P10 ✓ -->
      <template #charts>
        <!-- Main chart — switches based on ChartTypeToggle selection -->
        <ChartPanel
          :title="formatSymbol(filterStore.activeSymbol) + ' Price'"
          subtitle="1m candles"
        >
          <StateOverlay :state="mainChartState" title="Waiting for data" message="Candle data will appear once the stream starts sending kline events.">
            <LineChart
              v-if="filterStore.chartType === 'line'"
              :data="lineSeries"
              color="#3b82f6"
            />
            <LineChart
              v-else-if="filterStore.chartType === 'area'"
              :data="lineSeries"
              :area-fill="true"
              color="#3b82f6"
            />
            <BarChart
              v-else-if="filterStore.chartType === 'bar'"
              :data="barSeries"
            />
            <CandlestickChart
              v-else-if="filterStore.chartType === 'candlestick'"
              :category-data="candlestickSeries.categoryData"
              :values="candlestickSeries.values"
            />
          </StateOverlay>
        </ChartPanel>

        <!-- Secondary row: candlestick + volume (always visible) -->
        <div class="chart-split-row">
          <ChartPanel title="Candlestick" :subtitle="formatSymbol(filterStore.activeSymbol)">
            <CandlestickChart
              :category-data="candlestickSeries.categoryData"
              :values="candlestickSeries.values"
            />
          </ChartPanel>

          <ChartPanel title="Volume" :subtitle="formatSymbol(filterStore.activeSymbol)">
            <BarChart :data="barSeries" />
          </ChartPanel>
        </div>
      </template>

      <!-- Feed — P8 ✓ -->
      <template #feed>
        <ActivityFeed />
      </template>
    </DashboardGrid>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import DashboardGrid from '@/components/layout/DashboardGrid.vue'
import MetricsRow from '@/components/cards/MetricsRow.vue'
import ChartPanel from '@/components/charts/ChartPanel.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import CandlestickChart from '@/components/charts/CandlestickChart.vue'
import ActivityFeed from '@/components/feed/ActivityFeed.vue'
import StateOverlay from '@/components/status/StateOverlay.vue'
import { useFilterStore } from '@/stores/filter'
import { useConnectionStore } from '@/stores/connection'
import { useChartSeries } from '@/composables/useChartSeries'
import { formatSymbol } from '@/utils/formatters'

const filterStore = useFilterStore()
const connectionStore = useConnectionStore()
const { lineSeries, barSeries, candlestickSeries } = useChartSeries()

const mainChartState = computed(() => {
  if (connectionStore.status === 'connecting') return 'loading' as const
  if (lineSeries.value.length === 0 && candlestickSeries.value.values.length === 0) return 'empty' as const
  return 'ready' as const
})
</script>

<style scoped>
.chart-split-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 1279px) {
  .chart-split-row { grid-template-columns: 1fr; }
}
</style>

