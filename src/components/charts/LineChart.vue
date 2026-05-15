<template>
  <div ref="chartContainer" class="chart-container"></div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChartInstance } from '@/composables/useChartInstance'
import { useUIStore } from '@/stores/ui'

const props = defineProps<{
  data: [number, number][]    // [timestamp, value]
  color?: string
  areaFill?: boolean
  title?: string
}>()

const chartContainer = ref<HTMLElement | null>(null)
const { setOption } = useChartInstance(chartContainer)
const uiStore = useUIStore()

watch(
  () => [props.data, props.data.length, uiStore.theme],
  () => {
    if (!props.data.length) return

    const isDark = uiStore.theme === 'dark'
    const lineColor = props.color ?? '#3b82f6'

    setOption({
      animation: false,
      grid: {
        top: props.title ? 36 : 12,
        right: 16,
        bottom: 28,
        left: 56,
      },
      title: props.title ? {
        text: props.title,
        left: 12,
        top: 8,
        textStyle: {
          fontSize: 13,
          fontWeight: 600,
          color: isDark ? '#f0f4ff' : '#0f172a',
        },
      } : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1a2235' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        textStyle: { color: isDark ? '#f0f4ff' : '#0f172a', fontSize: 12 },
        axisPointer: {
          lineStyle: { color: 'rgba(59, 130, 246, 0.3)' },
        },
      },
      xAxis: {
        type: 'time',
        splitLine: { show: false },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } },
        axisLabel: {
          fontSize: 10,
          color: isDark ? '#4a5568' : '#94a3b8',
          formatter: (val: number) => {
            const d = new Date(val)
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
          },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' } },
        axisLabel: {
          fontSize: 10,
          color: isDark ? '#4a5568' : '#94a3b8',
        },
        scale: true,
      },
      series: [{
        type: 'line',
        data: props.data,
        showSymbol: false,
        smooth: true,
        lineStyle: { color: lineColor, width: 2 },
        areaStyle: props.areaFill ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: lineColor + '40' },
              { offset: 1, color: lineColor + '05' },
            ],
          },
        } : undefined,
      }],
    })
  },
  { immediate: true, deep: false }
)
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
