<template>
  <Transition name="banner">
    <div
      v-if="showBanner"
      class="connection-banner"
      :class="'banner-' + connectionStore.status"
    >
      <span class="banner-icon">{{ bannerIcon }}</span>
      <span class="banner-text">{{ bannerText }}</span>
      <span v-if="connectionStore.reconnectCount > 0" class="banner-count font-mono font-xs">
        attempt {{ connectionStore.reconnectCount }}
      </span>
      <button
        v-if="connectionStore.status === 'error' || connectionStore.status === 'disconnected'"
        class="banner-action"
        @click="reconnect"
      >
        Reconnect
      </button>
      <button class="banner-dismiss" @click="dismissed = true" title="Dismiss">✕</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { getConnectionManager } from '@/plugins/StreamingPlugin'

const connectionStore = useConnectionStore()
const dismissed = ref(false)

// Reset dismissed flag when status changes
watch(() => connectionStore.status, () => { dismissed.value = false })

const showBanner = computed(() => {
  if (dismissed.value) return false
  return connectionStore.status === 'error'
    || connectionStore.status === 'disconnected'
    || connectionStore.status === 'connecting'
})

const bannerIcon = computed(() => {
  switch (connectionStore.status) {
    case 'connecting':    return '⏳'
    case 'disconnected':  return '🔌'
    case 'error':         return '⚠️'
    default:              return ''
  }
})

const bannerText = computed(() => {
  switch (connectionStore.status) {
    case 'connecting':    return 'Connecting to data stream…'
    case 'disconnected':  return 'Connection lost. Data may be stale.'
    case 'error':         return 'Connection error. Retrying…'
    default:              return ''
  }
})

function reconnect(): void {
  const manager = getConnectionManager()
  manager?.stopAll()
  manager?.startAll()
}
</script>

<style scoped>
.connection-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-6);
  font-size: var(--text-sm);
  font-weight: 500;
  flex-shrink: 0;
}

.banner-connecting {
  background: var(--color-warning-dim);
  color: var(--color-warning);
  border-bottom: 1px solid var(--color-warning);
}

.banner-disconnected {
  background: var(--color-danger-dim);
  color: var(--color-danger);
  border-bottom: 1px solid var(--color-danger);
}

.banner-error {
  background: var(--color-danger-dim);
  color: var(--color-danger);
  border-bottom: 1px solid var(--color-danger);
}

.banner-icon { font-size: 14px; }
.banner-text { flex: 1; }

.banner-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.banner-action:hover {
  background: currentColor;
  color: #fff;
}

.banner-dismiss {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-dismiss:hover { opacity: 1; }

/* Transition */
.banner-enter-active,
.banner-leave-active {
  transition: all 300ms ease;
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.banner-enter-to,
.banner-leave-from {
  max-height: 40px;
}
</style>
