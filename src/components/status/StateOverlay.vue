<template>
  <!-- Loading skeleton -->
  <div v-if="state === 'loading'" class="state-overlay loading">
    <div class="skeleton-lines">
      <div class="skeleton-line w-40"></div>
      <div class="skeleton-line w-60"></div>
      <div class="skeleton-line w-30"></div>
    </div>
  </div>

  <!-- Error state -->
  <div v-else-if="state === 'error'" class="state-overlay error">
    <span class="state-icon">⚠️</span>
    <p class="state-title">{{ title || 'Something went wrong' }}</p>
    <p v-if="message" class="state-message text-muted font-sm">{{ message }}</p>
    <button v-if="onRetry" class="retry-btn" @click="onRetry">Retry</button>
  </div>

  <!-- Empty state -->
  <div v-else-if="state === 'empty'" class="state-overlay empty">
    <span class="state-icon">{{ icon || '📭' }}</span>
    <p class="state-title">{{ title || 'No data yet' }}</p>
    <p v-if="message" class="state-message text-muted font-sm">{{ message }}</p>
  </div>

  <!-- Content -->
  <slot v-else />
</template>

<script setup lang="ts">
defineProps<{
  state: 'loading' | 'error' | 'empty' | 'ready'
  title?: string
  message?: string
  icon?: string
  onRetry?: () => void
}>()
</script>

<style scoped>
.state-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  min-height: 120px;
}

/* Loading skeleton */
.skeleton-lines {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
}

.skeleton-line {
  height: 12px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-bg-elevated) 25%,
    var(--color-bg-overlay) 50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.w-30 { width: 30%; }
.w-40 { width: 40%; }
.w-60 { width: 60%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Icons */
.state-icon { font-size: 28px; }

/* Titles */
.state-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.state-message {
  text-align: center;
  max-width: 220px;
  line-height: 1.5;
}

/* Error accent */
.error .state-icon { filter: none; }
.error .state-title { color: var(--color-danger); }

/* Retry button */
.retry-btn {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-accent);
  background: var(--color-accent-dim);
  color: var(--color-accent);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: var(--color-accent);
  color: #fff;
}
</style>
