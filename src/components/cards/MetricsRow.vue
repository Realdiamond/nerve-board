<template>
  <div class="metrics-row">
    <MetricCard
      v-for="metric in activeMetrics"
      :key="metric.id"
      :label="metric.label"
      :value="metric.value"
      :previous-value="metric.previousValue"
      :format="metric.format"
      :trend="metric.trend"
    />
  </div>
</template>

<script setup lang="ts">
import MetricCard from '@/components/cards/MetricCard.vue'
import { useDerivedMetrics } from '@/composables/useDerivedMetrics'

const { activeMetrics } = useDerivedMetrics()
</script>

<style scoped>
.metrics-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-3);
}

@media (max-width: 1279px) {
  .metrics-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 767px) {
  .metrics-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
