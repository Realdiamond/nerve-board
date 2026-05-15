<template>
  <div class="activity-item" :class="[item.colorClass, { 'is-new': isNew }]">
    <span class="item-icon" :title="item.type">{{ item.icon }}</span>
    <div class="item-body">
      <span class="item-message">{{ item.message }}</span>
      <div class="item-meta">
        <span class="badge item-badge" :class="'badge-' + item.severity">
          {{ item.type }}
        </span>
        <span class="item-time font-mono">{{ item.timeAgo }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedItem } from '@/composables/useFormattedFeed'

defineProps<{
  item: FeedItem
  isNew?: boolean
}>()
</script>

<style scoped>
.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-fast);
  position: relative;
}

.activity-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.activity-item:hover {
  background: var(--color-bg-elevated);
}

.activity-item:hover::before {
  opacity: 1;
}

/* Severity left border colors */
.item-low::before    { background: var(--color-accent); }
.item-medium::before { background: var(--color-warning); }
.item-high::before   { background: var(--color-danger); }

/* New item entrance animation */
.is-new { animation: fadeSlideIn 300ms ease forwards; }

/* Icon */
.item-icon {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
  width: 20px;
  text-align: center;
}

/* Body */
.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.item-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
  word-break: break-word;
}

.item-high .item-message   { color: var(--color-text-primary); }
.item-medium .item-message { color: var(--color-text-primary); }

/* Meta row */
.item-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.item-badge {
  font-size: 9px;
  padding: 1px 5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.item-time {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
