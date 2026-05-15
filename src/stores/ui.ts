import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

export const useUIStore = defineStore('ui', () => {
  const theme = ref<Theme>('dark')
  const sidebarOpen = ref<boolean>(true)

  // Sync theme to <html data-theme> attribute
  watch(theme, (t) => {
    document.documentElement.setAttribute('data-theme', t)
  })

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  return { theme, sidebarOpen, toggleTheme, toggleSidebar }
})
