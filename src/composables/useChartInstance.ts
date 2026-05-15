// ─── useChartInstance ──────────────────────────────────────────────────────────
// Shared composable for all ECharts components.
// Handles: init, resize, dispose, theme sync.
// Each chart component calls this once and gets a managed instance.

import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { echarts, type ECharts, type EChartsOption } from '@/lib/echarts'
import { useUIStore } from '@/stores/ui'

export function useChartInstance(containerRef: Ref<HTMLElement | null>) {
  const chart = ref<ECharts | null>(null)
  const uiStore = useUIStore()
  let resizeObserver: ResizeObserver | null = null

  // ── ECharts dark/light theme tokens ────────────────────────────────────────

  function getThemeOverrides(): Record<string, unknown> {
    const isDark = uiStore.theme === 'dark'
    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: isDark ? '#8b99b5' : '#475569',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
      },
      title: {
        textStyle: { color: isDark ? '#f0f4ff' : '#0f172a' },
      },
    }
  }

  // ── Init on mount ──────────────────────────────────────────────────────────

  onMounted(() => {
    if (!containerRef.value) return

    chart.value = echarts.init(containerRef.value, undefined, {
      renderer: 'canvas',
    })

    // ResizeObserver for responsive charts
    resizeObserver = new ResizeObserver(() => {
      chart.value?.resize()
    })
    resizeObserver.observe(containerRef.value)
  })

  // ── Theme sync ─────────────────────────────────────────────────────────────

  watch(() => uiStore.theme, () => {
    if (!chart.value) return
    chart.value.setOption(getThemeOverrides())
  })

  // ── Cleanup ────────────────────────────────────────────────────────────────

  onUnmounted(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
    chart.value?.dispose()
    chart.value = null
  })

  // ── Imperative setOption wrapper ───────────────────────────────────────────

  function setOption(option: EChartsOption, notMerge = false): void {
    if (!chart.value) return
    chart.value.setOption(
      { ...getThemeOverrides(), ...option },
      { notMerge }
    )
  }

  return { chart, setOption }
}
