<template>
  <header class="topbar">
    <!-- Left: Brand -->
    <div class="topbar-brand">
      <span class="brand-icon">⚡</span>
      <span class="brand-name">nerve-board</span>
      <span class="brand-tag">LIVE</span>
    </div>

    <!-- Center: Active symbol tabs -->
    <nav class="symbol-tabs">
      <button
        v-for="sym in DEFAULT_SYMBOLS"
        :key="sym"
        class="symbol-tab"
        :class="{ active: filterStore.activeSymbol === sym }"
        @click="filterStore.setActiveSymbol(sym)"
      >
        {{ formatSymbol(sym) }}
      </button>
    </nav>

    <!-- Right: Controls -->
    <div class="topbar-controls">
      <!-- Connection status -->
      <div class="conn-status" :class="'conn-' + connectionStore.status">
        <span class="conn-dot"></span>
        <span class="conn-label">{{ connectionStore.status }}</span>
        <span v-if="connectionStore.status === 'connected'" class="conn-latency text-muted">
          {{ connectionStore.latencyMs }}ms
        </span>
      </div>

      <!-- Theme toggle -->
      <button
        class="ctrl-btn"
        :title="`Switch to ${uiStore.theme === 'dark' ? 'light' : 'dark'} mode`"
        @click="uiStore.toggleTheme()"
      >
        {{ uiStore.theme === 'dark' ? '☀️' : '🌙' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useConnectionStore } from '@/stores/connection'
import { useFilterStore } from '@/stores/filter'
import { useUIStore } from '@/stores/ui'
import { formatSymbol } from '@/utils/formatters'
import { DEFAULT_SYMBOLS } from '@/types/market'

const connectionStore = useConnectionStore()
const filterStore = useFilterStore()
const uiStore = useUIStore()
</script>

<style scoped>
.topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 0 var(--space-6);
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  z-index: 100;
}

/* Brand */
.topbar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.brand-icon { font-size: var(--text-md); }

.brand-name {
  font-size: var(--text-md);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}

.brand-tag {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-success);
  background: var(--color-success-dim);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.08em;
  animation: pulse 2s ease-in-out infinite;
}

/* Symbol tabs */
.symbol-tabs {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  overflow-x: auto;
}

.symbol-tab {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.symbol-tab:hover {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
}

.symbol-tab.active {
  background: var(--color-accent-dim);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Right controls */
.topbar-controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

/* Connection status */
.conn-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-bg-elevated);
}

.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.conn-connected  { color: var(--color-success); }
.conn-connected .conn-dot { background: var(--color-success); animation: pulse 2s ease-in-out infinite; }
.conn-connecting { color: var(--color-warning); }
.conn-connecting .conn-dot { background: var(--color-warning); animation: pulse 1s ease-in-out infinite; }
.conn-disconnected, .conn-error { color: var(--color-danger); }
.conn-disconnected .conn-dot, .conn-error .conn-dot { background: var(--color-danger); }
.conn-paused { color: var(--color-accent); }
.conn-paused .conn-dot { background: var(--color-accent); }

.conn-label { font-size: var(--text-xs); }
.conn-latency { font-family: var(--font-mono); font-size: var(--text-xs); }

/* Control buttons */
.ctrl-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-base);
  transition: all var(--transition-fast);
}

.ctrl-btn:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}

/* Mobile: hide symbol tabs */
@media (max-width: 767px) {
  .symbol-tabs { display: none; }
  .topbar { padding: 0 var(--space-4); }
  .conn-label { display: none; }
}
</style>
