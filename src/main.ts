import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import { StreamingPlugin } from './plugins/StreamingPlugin'
import App from './App.vue'

import './assets/styles/tokens.css'

const app = createApp(App)

// Pinia MUST be installed before StreamingPlugin (plugin uses stores)
app.use(createPinia())
app.use(router)

// Start streaming — uses mode from .env (mock/live)
const streamMode = (import.meta.env.VITE_STREAM_MODE as 'mock' | 'live') || 'mock'
const streamSymbols = (import.meta.env.VITE_STREAM_SYMBOLS || 'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT').split(',')

app.use(StreamingPlugin, {
  mode: streamMode,
  symbols: streamSymbols,
})

app.mount('#app')
