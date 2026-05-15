import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // Raise the warning threshold since ECharts is inherently large
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Isolate ECharts into its own chunk (cached independently)
          'echarts': ['echarts/core', 'echarts/charts', 'echarts/renderers', 'echarts/components'],
          // Vue runtime
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
