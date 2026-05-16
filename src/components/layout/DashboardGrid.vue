<template>
  <div class="dashboard-grid">
    <!-- Metrics row — always full width -->
    <section class="grid-metrics">
      <slot name="metrics" />
    </section>

    <!-- Main content area: charts + feed -->
    <div class="grid-body">
      <!-- Charts column -->
      <section class="grid-charts">
        <slot name="charts" />
      </section>

      <!-- Feed column -->
      <aside class="grid-feed">
        <slot name="feed" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
// Pure layout — no props, no store access
</script>

<style scoped>
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
}

/* Metrics row */
.grid-metrics {
  flex-shrink: 0;
}

/* Body: charts + feed side-by-side */
.grid-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--space-4);
  min-height: 0; /* prevent flex overflow */
}

.grid-charts {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  overflow-y: auto;
}

.grid-feed {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Tablet: stack feed below charts */
@media (max-width: 1279px) {
  .dashboard-grid {
    height: auto;
  }

  .grid-body {
    display: flex;
    flex-direction: column;
  }

  .grid-charts {
    overflow-y: visible;
  }

  .grid-feed {
    max-height: none;
    overflow-y: visible;
  }
}

/* Mobile: full single column */
@media (max-width: 767px) {
  /* Handled by tablet flex-column */
}
</style>
