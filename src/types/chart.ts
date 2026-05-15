// ─── Chart type variants ──────────────────────────────────────────────────────
export type ChartType = 'line' | 'bar' | 'area' | 'candlestick'

export interface ChartTypeOption {
  key: ChartType
  label: string
  icon: string
}

export const CHART_TYPES: ChartTypeOption[] = [
  { key: 'line',        label: 'Line',        icon: '📈' },
  { key: 'area',        label: 'Area',        icon: '📉' },
  { key: 'bar',         label: 'Bar',         icon: '📊' },
  { key: 'candlestick', label: 'Candlestick', icon: '🕯️' },
]

// ─── Generic chart config ─────────────────────────────────────────────────────
export interface ChartConfig {
  title?: string
  symbol: string
  type: ChartType
  showLegend?: boolean
  showGrid?: boolean
  height?: number
}

// ─── Metric card data shape ───────────────────────────────────────────────────
export type MetricFormat = 'currency' | 'percent' | 'number' | 'volume'
export type TrendDirection = 'up' | 'down' | 'flat'

export interface MetricCardData {
  id: string
  label: string
  value: number
  previousValue?: number
  format: MetricFormat
  trend?: TrendDirection
  unit?: string
}
