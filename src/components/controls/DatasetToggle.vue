<template>
  <div class="dataset-toggle">
    <span class="toggle-label text-muted font-xs">Symbols</span>
    <button
      v-for="sym in DEFAULT_SYMBOLS"
      :key="sym"
      class="dataset-btn"
      :class="{ active: filterStore.visibleDatasets.has(sym) }"
      @click="filterStore.toggleDataset(sym)"
    >
      <span class="dataset-dot"></span>
      {{ shortSymbol(sym) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useFilterStore } from '@/stores/filter'
import { DEFAULT_SYMBOLS } from '@/types/market'

const filterStore = useFilterStore()

function shortSymbol(sym: string): string {
  return sym.replace('USDT', '')
}
</script>

<style scoped>
.dataset-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.toggle-label {
  margin-right: var(--space-1);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dataset-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dataset-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}

.dataset-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-dim);
}

.dataset-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}

.dataset-btn:nth-child(2) { --color-accent: #3b82f6; }
.dataset-btn:nth-child(3) { --color-accent: #10b981; }
.dataset-btn:nth-child(4) { --color-accent: #f59e0b; }
.dataset-btn:nth-child(5) { --color-accent: #8b5cf6; }
</style>
