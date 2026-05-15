<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { onMounted } from 'vue'

const uiStore = useUIStore()

// Apply theme to <html> on mount and whenever it changes
onMounted(() => {
  document.documentElement.setAttribute('data-theme', uiStore.theme)
})
</script>
