<template>
  <div class="metric-card" :class="'trend-' + trendClass">
    <!-- Header -->
    <div class="card-header">
      <span class="card-label">{{ label }}</span>
      <span v-if="trend" class="trend-arrow">{{ trendArrow }}</span>
    </div>

    <!-- Value -->
    <div class="card-value font-mono" :class="valueColorClass">
      {{ formattedValue }}
    </div>

    <!-- Delta -->
    <div v-if="delta !== null" class="card-delta" :class="valueColorClass">
      {{ delta }}
    </div>

    <!-- Sparkline bar (visual accent) -->
    <div class="card-accent-bar" :class="'accent-' + trendClass"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MetricFormat, TrendDirection } from '@/types/chart'
import {
  formatCurrency,
  formatPercent,
  formatVolume,
  formatNumber,
} from '@/utils/formatters'

interface Props {
  label: string
  value: number
  previousValue?: number
  format: MetricFormat
  trend?: TrendDirection
}

const props = defineProps<Props>()

// ── Formatted value ───────────────────────────────────────────────────────────

const formattedValue = computed(() => {
  switch (props.format) {
    case 'currency': return formatCurrency(props.value)
    case 'percent':  return formatPercent(props.value)
    case 'volume':   return formatVolume(props.value)
    default:         return formatNumber(props.value)
  }
})

// ── Delta from previous value ─────────────────────────────────────────────────

const delta = computed<string | null>(() => {
  if (props.previousValue === undefined || props.format === 'percent') return null
  const diff = props.value - props.previousValue
  if (Math.abs(diff) < 0.0001) return null
  const sign = diff >= 0 ? '+' : ''
  return props.format === 'currency'
    ? `${sign}${formatCurrency(diff)}`
    : `${sign}${formatNumber(diff)}`
})

// ── Trend helpers ─────────────────────────────────────────────────────────────

const trendClass = computed(() => props.trend ?? 'flat')

const trendArrow = computed(() => {
  if (props.trend === 'up')   return '▲'
  if (props.trend === 'down') return '▼'
  return '—'
})

const valueColorClass = computed(() => {
  if (props.trend === 'up')   return 'text-up'
  if (props.trend === 'down') return 'text-down'
  return 'text-primary'
})
</script>

<style scoped>
.metric-card {
  position: relative;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  cursor: default;
}

.metric-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

/* Top accent bar */
.card-accent-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}

.accent-up   { background: var(--color-up); }
.accent-down { background: var(--color-down); }
.accent-flat { background: var(--color-border-strong); }

/* Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.trend-arrow {
  font-size: var(--text-xs);
  font-weight: 700;
}

.trend-up   .trend-arrow { color: var(--color-up); }
.trend-down .trend-arrow { color: var(--color-down); }
.trend-flat .trend-arrow { color: var(--color-flat); }

/* Value */
.card-value {
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  transition: color var(--transition-fast);
}

/* Delta */
.card-delta {
  font-size: var(--text-xs);
  font-weight: 500;
  font-family: var(--font-mono);
  opacity: 0.8;
}
</style>
