<template>
  <div class="chart-panel surface">
    <div class="panel-header">
      <div class="panel-title-group">
        <h3 class="panel-title">{{ title }}</h3>
        <span v-if="subtitle" class="panel-subtitle text-muted font-xs">{{ subtitle }}</span>
      </div>
      <div class="panel-actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.chart-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 300px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel-title-group {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.panel-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.panel-subtitle {
  font-family: var(--font-mono);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.panel-body {
  flex: 1;
  min-height: 0;
  padding: var(--space-2);
}
</style>
