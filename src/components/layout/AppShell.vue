<template>
  <div class="app-shell">
    <TopBar />
    <ControlsBar />
    <ConnectionBanner />
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import TopBar from './TopBar.vue'
import ControlsBar from '@/components/controls/ControlsBar.vue'
import ConnectionBanner from '@/components/status/ConnectionBanner.vue'
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--color-bg-base);
}

.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-4) var(--space-6);
}

/* Tablet */
@media (max-width: 1279px) {
  .app-main { padding: var(--space-4); }
}

/* Mobile */
@media (max-width: 767px) {
  .app-main { padding: var(--space-3); }
}
</style>
