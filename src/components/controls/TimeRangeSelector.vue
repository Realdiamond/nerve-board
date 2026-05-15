<template>
  <div class="time-range-selector">
    <button
      v-for="range in TIME_RANGES"
      :key="range.key"
      class="range-btn"
      :class="{ active: filterStore.timeRange === range.key }"
      @click="filterStore.setTimeRange(range.key)"
    >
      {{ range.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useFilterStore } from '@/stores/filter'
import { TIME_RANGES } from '@/types/market'

const filterStore = useFilterStore()
</script>

<style scoped>
.time-range-selector {
  display: flex;
  gap: 2px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 2px;
}

.range-btn {
  padding: var(--space-1) var(--space-3);
  border-radius: calc(var(--radius-md) - 2px);
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.range-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-overlay);
}

.range-btn.active {
  background: var(--color-accent-dim);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}
</style>
