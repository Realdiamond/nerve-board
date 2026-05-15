<template>
  <div ref="chartContainer" class="chart-container"></div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChartInstance } from '@/composables/useChartInstance'
import { useUIStore } from '@/stores/ui'

interface BarDataItem {
  value: [number, number]
  itemStyle?: { color: string }
}

const props = defineProps<{
  data: BarDataItem[]
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
      },
      series: [{
        type: 'bar',
        data: props.data,
        barMaxWidth: 12,
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
