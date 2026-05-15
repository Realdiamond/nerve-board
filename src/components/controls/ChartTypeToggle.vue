<template>
  <div class="chart-type-toggle">
    <button
      v-for="opt in CHART_TYPES"
      :key="opt.key"
      class="toggle-btn"
      :class="{ active: filterStore.chartType === opt.key }"
      :title="opt.label"
      @click="filterStore.setChartType(opt.key)"
    >
      <span class="btn-icon">{{ opt.icon }}</span>
      <span class="btn-label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useFilterStore } from '@/stores/filter'
import { CHART_TYPES } from '@/types/chart'

const filterStore = useFilterStore()
</script>

<style scoped>
.chart-type-toggle {
  display: flex;
  gap: 2px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: calc(var(--radius-md) - 2px);
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.toggle-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-overlay);
}

.toggle-btn.active {
  background: var(--color-accent-dim);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.btn-icon { font-size: 12px; }
.btn-label { font-size: var(--text-xs); }

@media (max-width: 900px) {
  .btn-label { display: none; }
}
</style>
