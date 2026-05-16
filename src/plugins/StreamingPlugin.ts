// ─── StreamingPlugin ──────────────────────────────────────────────────────────
// Vue plugin that bridges Layer 1 (Streaming) ↔ Layer 2 (Pinia Stores).
//
// Live mode → CoinCapAdapter (WS + REST, browser-safe, no auth)
// Mock mode → MockStreamAdapter (deterministic fake data)
//
// Auto-fallback: If CoinCap WS fails → gracefully switch to mock.

import type { App } from 'vue'
import { ConnectionManager } from '@/services/streaming/ConnectionManager'
import { CoinCapAdapter } from '@/services/streaming/CoinCapAdapter'
import { MockStreamAdapter } from '@/services/streaming/MockStreamAdapter'
import { MessageParser } from '@/services/streaming/MessageParser'
import { getAllSlugs } from '@/services/streaming/SymbolMap'
import { useMarketStore } from '@/stores/market'
import { useActivityStore } from '@/stores/activity'
import { useConnectionStore } from '@/stores/connection'
import type { StreamStatus } from '@/services/streaming'

// ── Config ───────────────────────────────────────────────────────────────────

interface StreamingPluginOptions {
  mode: 'live' | 'mock'
  symbols?: string[]
}

// ── Singleton manager ────────────────────────────────────────────────────────

let manager: ConnectionManager | null = null

export function getConnectionManager(): ConnectionManager | null {
  return manager
}

// ── Plugin install ───────────────────────────────────────────────────────────

export const StreamingPlugin = {
  install(app: App, options: StreamingPluginOptions) {
    const symbols = options.symbols ?? ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']

    const marketStore = useMarketStore()
    const activityStore = useActivityStore()
    const connectionStore = useConnectionStore()

    // ── Wire manager → stores ────────────────────────────────────────────────

    function wireManager(mgr: ConnectionManager): void {
      mgr.getBuffer().onFlush((batch) => {
        marketStore.ingestBatch(batch)
        connectionStore.recordMessage()
      })
      mgr.onStatus((status: StreamStatus) => {
        connectionStore.setStatus(status)
      })
      mgr.onActivity((message, severity) => {
        const event = MessageParser.createSystemEvent(message, severity)
        activityStore.push(event)
      })
    }

    // ── Start mock ───────────────────────────────────────────────────────────

    function startMock(mgr: ConnectionManager, reason?: string): void {
      if (reason) {
        console.warn(`[StreamingPlugin] Fallback to Mock: ${reason}`)
        activityStore.push(
          MessageParser.createSystemEvent(`⚠️ ${reason}. Using mock data.`, 'high')
        )
        connectionStore.setStatus('fallback-mock')
      } else {
        console.info(`[StreamingPlugin] Starting MOCK mode`)
      }

      const mockAdapter = new MockStreamAdapter({
        url: 'mock://local',
        symbols: symbols.map(s => s.toUpperCase()),
        tickIntervalMs: 800,
        volatility: 0.12,
      })
      mgr.addAdapter(mockAdapter)
      mgr.startAll()
    }

    // ── Initialize ───────────────────────────────────────────────────────────

    manager = new ConnectionManager()
    wireManager(manager)

    if (options.mode === 'live') {
      console.info(`[StreamingPlugin] Starting LIVE mode via CoinCap`)
      connectionStore.setStatus('connecting')

      const apiKey = import.meta.env.VITE_COINCAP_API_KEY as string
      if (!apiKey) {
        console.warn(`[StreamingPlugin] No VITE_COINCAP_API_KEY — falling back to mock`)
        startMock(manager, 'Missing CoinCap API key in .env')
        app.provide('connectionManager', manager)
        return
      }

      const slugs = getAllSlugs(symbols)
      console.info(`[StreamingPlugin] Symbols: ${symbols.join(', ')} → Slugs: ${slugs.join(', ')}`)

      const coinCapAdapter = new CoinCapAdapter({
        url: 'wss://ws.coincap.io/prices', // Unused now but required by interface
        slugs,
        apiKey,
        restPollIntervalMs: 2000,
        candleIntervalMs: 60_000,
      })

      // Monitor for total failure → switch to mock
      coinCapAdapter.onStatus((status: StreamStatus) => {
        if (status === 'failed') {
          console.warn(`[StreamingPlugin] CoinCap failed — switching to mock`)
          manager?.destroy()
          manager = new ConnectionManager()
          wireManager(manager)
          startMock(manager, 'CoinCap WS unstable — switched to mock data')
        }
      })

      manager.addAdapter(coinCapAdapter)
      manager.startAll()

    } else {
      startMock(manager)
    }

    app.provide('connectionManager', manager)
  },
}
