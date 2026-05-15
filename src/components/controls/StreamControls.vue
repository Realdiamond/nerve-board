<template>
  <div class="stream-controls">
    <!-- Pause / Resume -->
    <button
      class="ctrl-btn"
      :class="connectionStore.isPaused ? 'btn-resume' : 'btn-pause'"
      :title="connectionStore.isPaused ? 'Resume stream' : 'Pause stream'"
      @click="togglePause"
    >
      <span class="btn-icon">{{ connectionStore.isPaused ? '▶' : '⏸' }}</span>
      <span class="btn-text">{{ connectionStore.isPaused ? 'Resume' : 'Pause' }}</span>
    </button>

    <!-- Reconnect (only when disconnected/error) -->
    <button
      v-if="canReconnect"
      class="ctrl-btn btn-reconnect"
      title="Reconnect stream"
      @click="reconnect"
    >
      <span class="btn-icon">↺</span>
      <span class="btn-text">Reconnect</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { getConnectionManager } from '@/plugins/StreamingPlugin'

const connectionStore = useConnectionStore()

const canReconnect = computed(() =>
  connectionStore.status === 'disconnected' || connectionStore.status === 'error'
)

function togglePause(): void {
  const manager = getConnectionManager()
  if (!manager) return
  if (connectionStore.isPaused) {
    manager.resumeAll()
    connectionStore.setPaused(false)
  } else {
    manager.pauseAll()
    connectionStore.setPaused(true)
  }
}

function reconnect(): void {
  const manager = getConnectionManager()
  if (!manager) return
  manager.resumeAll()
  connectionStore.setStatus('connecting')
}
</script>

<style scoped>
.stream-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-icon { font-size: 11px; }
.btn-text { white-space: nowrap; }

.btn-pause {
  color: var(--color-text-secondary);
}
.btn-pause:hover {
  border-color: var(--color-warning);
  color: var(--color-warning);
  background: var(--color-warning-dim);
}

.btn-resume {
  border-color: var(--color-success);
  color: var(--color-success);
  background: var(--color-success-dim);
}
.btn-resume:hover {
  background: var(--color-success);
  color: #fff;
}

.btn-reconnect {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-dim);
}
.btn-reconnect:hover {
  background: var(--color-accent);
  color: #fff;
}

@media (max-width: 900px) {
  .btn-text { display: none; }
}
</style>
