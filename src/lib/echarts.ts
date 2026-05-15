// ─── ECharts Tree-Shaken Setup ────────────────────────────────────────────────
// Only import the chart types, components, and renderers we actually use.
// This drops the ECharts bundle from ~1MB to ~400KB gzipped.

import * as echarts from 'echarts/core'

// Renderers
import { CanvasRenderer } from 'echarts/renderers'

// Chart types we use
import { LineChart } from 'echarts/charts'
import { BarChart } from 'echarts/charts'
import { CandlestickChart } from 'echarts/charts'

// Components we use
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components'

import { 
  LineSeriesOption, 
  BarSeriesOption, 
  CandlestickSeriesOption 
} from 'echarts/charts'
import {
  TitleComponentOption,
  TooltipComponentOption,
  GridComponentOption,
  DataZoomComponentOption,
  ToolboxComponentOption,
} from 'echarts/components'
import { ComposeOption } from 'echarts/core'

// Register only what we need
echarts.use([
  CanvasRenderer,
  LineChart,
  BarChart,
  CandlestickChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent,
])

export type EChartsOption = ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | CandlestickSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DataZoomComponentOption
  | ToolboxComponentOption
>

// Re-export the configured echarts instance
export { echarts }
export type { ECharts } from 'echarts/core'
