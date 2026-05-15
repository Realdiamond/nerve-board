<template>
  <div class="activity-feed surface">
    <!-- Header -->
    <div class="feed-header">
      <div class="feed-title-group">
        <span class="feed-title">Activity Feed</span>
        <span v-if="alertCount > 0" class="alert-badge badge badge-high">
          {{ alertCount }} alert{{ alertCount !== 1 ? 's' : '' }}
        </span>
      </div>
      <div class="feed-controls">
        <span class="total-count text-muted font-xs font-mono">{{ totalCount }}</span>
        <button
          class="clear-btn"
          title="Clear feed"
          @click="activityStore.clear()"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Feed list with virtual scroll hint (real virtual scroll in later phase) -->
    <div ref="feedListEl" class="feed-list">
      <TransitionGroup name="feed-item">
        <ActivityItem
          v-for="(item, idx) in feedItems"
          :key="item.id"
          :item="item"
          :is-new="idx === 0 && isLatestNew"
        />
      </TransitionGroup>

      <!-- Empty state -->
      <div v-if="feedItems.length === 0" class="feed-empty">
        <span class="text-muted font-sm">Waiting for events…</span>
      </div>
    </div>

    <!-- Footer: live indicator -->
    <div class="feed-footer">
      <span class="live-dot pulse"></span>
      <span class="text-muted font-xs">Live streaming</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ActivityItem from './ActivityItem.vue'
import { useFormattedFeed } from '@/composables/useFormattedFeed'
import { useActivityStore } from '@/stores/activity'

const activityStore = useActivityStore()
const { feedItems, alertCount, totalCount } = useFormattedFeed(150)

// Track whether the very latest item is brand new (for entrance animation)
const isLatestNew = ref(false)
let newFlagTimer: ReturnType<typeof setTimeout> | null = null

watch(totalCount, () => {
  isLatestNew.value = true
  if (newFlagTimer) clearTimeout(newFlagTimer)
  newFlagTimer = setTimeout(() => { isLatestNew.value = false }, 400)
})

// Auto-scroll to top on new events (feed is newest-first)
const feedListEl = ref<HTMLElement | null>(null)
watch(totalCount, () => {
  if (feedListEl.value && feedListEl.value.scrollTop < 80) {
    feedListEl.value.scrollTop = 0
  }
})
</script>

<style scoped>
.activity-feed {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.feed-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.feed-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.alert-badge {
  animation: pulse 2s ease-in-out infinite;
}

.feed-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.total-count {
  min-width: 24px;
  text-align: right;
}

.clear-btn {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: var(--color-danger-dim);
}

/* List */
.feed-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.feed-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
}

/* Footer */
.feed-footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  flex-shrink: 0;
}

/* TransitionGroup animations */
.feed-item-enter-active {
  transition: all 250ms ease;
}

.feed-item-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

.feed-item-leave-active {
  transition: all 200ms ease;
  position: absolute;
  width: 100%;
}

.feed-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
