<template>
  <div class="controls-bar">
    <div class="controls-left">
      <TimeRangeSelector />
      <div class="divider"></div>
      <ChartTypeToggle />
    </div>
    <div class="controls-right">
      <DatasetToggle />
      <div class="divider"></div>
      <StreamControls />
    </div>
  </div>
</template>

<script setup lang="ts">
import TimeRangeSelector from './TimeRangeSelector.vue'
import ChartTypeToggle from './ChartTypeToggle.vue'
import DatasetToggle from './DatasetToggle.vue'
import StreamControls from './StreamControls.vue'
</script>

<style scoped>
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-6);
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  overflow-x: auto;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .controls-bar { 
    padding: var(--space-2) var(--space-3); 
    gap: var(--space-3);
    justify-content: flex-start; /* allow natural scrolling instead of spacing out */
  }
}
</style>
