// ─── CoinCapAdapter ───────────────────────────────────────────────────────────
// Hybrid adapter: WebSocket for real-time price ticks + REST polling for
// full asset data (volume, 24h change) + synthetic candle generation.
//
// Data sources:
//   WS:   wss://ws.coincap.io/prices?assets=bitcoin,ethereum,...&apiKey=KEY
//   REST: https://rest.coincap.io/v3/assets?ids=bitcoin,ethereum,...
//
// Requires a free prepaid API key (auto-created via POST /v3/prepaid/create).
// Browser-safe, no CORS issues.
//
// Emits pre-parsed messages (kind/data) that MessageParser passes through.

import { StreamAdapter } from './StreamAdapter'
import type { StreamAdapterConfig } from './StreamAdapter'
import { toSymbol } from './SymbolMap'
import type { TickerDTO, CandleDTO } from '@/types/streaming'

// ── Config ───────────────────────────────────────────────────────────────────

export interface CoinCapAdapterConfig extends StreamAdapterConfig {
  slugs: string[]                // CoinCap asset slugs: ['bitcoin', 'ethereum', ...]
  apiKey: string                 // CoinCap prepaid API key
  restPollIntervalMs?: number    // How often to poll REST for full asset data (default: 10s)
  candleIntervalMs?: number      // Candle bucket duration (default: 60s)
}

// ── Synthetic Candle Bucket ──────────────────────────────────────────────────

interface CandleBucket {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  tickCount: number
}

// ── REST response shape (CoinCap v3) ─────────────────────────────────────────

interface CoinCapAsset {
  id: string
  symbol: string
  priceUsd: string
  changePercent24Hr: string | null
  volumeUsd24Hr: string | null
  vwap24Hr: string | null
  supply: string | null
  marketCapUsd: string | null
}

// ── Adapter ──────────────────────────────────────────────────────────────────

const COINCAP_WS = 'wss://ws.coincap.io/prices'
const COINCAP_REST = 'https://rest.coincap.io/v3/assets'

export class CoinCapAdapter extends StreamAdapter {
  private ws: WebSocket | null = null
  private restTimer: ReturnType<typeof setInterval> | null = null
  private candleTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private isPaused = false
  private shouldReconnect = true

  private readonly slugs: string[]
  private readonly apiKey: string
  private readonly restPollMs: number
  private readonly candleMs: number
  private readonly maxReconnect = 5
  private readonly baseDelay = 2000

  // Candle state: one bucket per slug
  private candles: Map<string, CandleBucket> = new Map()

  // Last known ticker data from REST (merged with WS price)
  private lastAssetData: Map<string, CoinCapAsset> = new Map()

  constructor(config: CoinCapAdapterConfig) {
    super(config)
    this.slugs = config.slugs
    this.apiKey = config.apiKey
    this.restPollMs = config.restPollIntervalMs ?? 10_000
    this.candleMs = config.candleIntervalMs ?? 60_000
    this.status = 'idle'
  }

  // ── Connect ────────────────────────────────────────────────────────────────

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return

    this.shouldReconnect = true
    this.emitStatus('connecting')

    // 1. Open WebSocket for real-time price ticks (API key required)
    const wsUrl = `${COINCAP_WS}?assets=${this.slugs.join(',')}&apiKey=${this.apiKey}`
    console.info(`[CoinCap] Connecting WS: ${COINCAP_WS}?assets=${this.slugs.join(',')}&apiKey=***`)

    try {
      this.ws = new WebSocket(wsUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[CoinCap] WS construction failed: ${msg}`)
      this.emitError(new Error(msg))
      this.emitStatus('error')
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      console.info(`[CoinCap] WS connected ✓`)
      this.reconnectAttempts = 0
      this.emitStatus('connected')

      // 2. Start REST polling for full asset data
      this.startRestPolling()
      // 3. Start candle bucket rotation
      this.startCandleRotation()
      // 4. Initial REST fetch immediately
      this.fetchAssets()
      // 5. Backfill 2h of real historical candles
      this.backfillHistory()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      if (this.isPaused) return
      try {
        const prices = JSON.parse(event.data as string) as Record<string, string>
        this.handlePriceTick(prices)
      } catch { /* ignore malformed */ }
    }

    this.ws.onerror = () => {
      this.emitError(new Error('CoinCap WebSocket error'))
      this.emitStatus('error')
    }

    this.ws.onclose = (event: CloseEvent) => {
      if (this.isPaused) {
        this.emitStatus('paused')
        return
      }

      console.warn(`[CoinCap] WS closed: code=${event.code}`)
      this.stopRestPolling()
      this.stopCandleRotation()
      this.emitStatus('disconnected')

      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }
  }

  // ── Handle WS price tick ───────────────────────────────────────────────────
  // CoinCap sends: { "bitcoin": "104231.42", "ethereum": "2503.11" }

  private handlePriceTick(prices: Record<string, string>): void {
    for (const [slug, priceStr] of Object.entries(prices)) {
      const price = parseFloat(priceStr)
      if (isNaN(price) || price <= 0) continue

      const symbol = toSymbol(slug)
      const now = Date.now()

      // Update candle bucket
      this.updateCandleBucket(slug, price, now)

      // Emit a ticker update (merge with cached REST data if available)
      const cached = this.lastAssetData.get(slug)
      const openPrice = cached ? parseFloat(cached.priceUsd) || price : price
      const changePercent = cached ? parseFloat(cached.changePercent24Hr ?? '0') : 0
      const volume = cached ? parseFloat(cached.volumeUsd24Hr ?? '0') : 0

      const ticker: TickerDTO = {
        symbol,
        lastPrice: price,
        priceChange: price - openPrice,
        priceChangePercent: changePercent,
        highPrice: price,    // Will be enriched by REST poll
        lowPrice: price,
        volume: volume,
        quoteVolume: volume,
        openTime: 0,
        closeTime: now,
      }

      // Emit as pre-parsed message
      this.emitMessage({ _parsed: true, kind: 'ticker', data: ticker })
    }
  }

  // ── Synthetic Candle Builder ───────────────────────────────────────────────

  private updateCandleBucket(slug: string, price: number, now: number): void {
    let bucket = this.candles.get(slug)

    if (!bucket) {
      // Start new bucket
      bucket = {
        openTime: now,
        open: price,
        high: price,
        low: price,
        close: price,
        tickCount: 0,
      }
      this.candles.set(slug, bucket)
    }

    // Update running candle
    bucket.high = Math.max(bucket.high, price)
    bucket.low = Math.min(bucket.low, price)
    bucket.close = price
    bucket.tickCount++

    // Emit live (unclosed) candle update
    this.emitCandle(slug, bucket, false)
  }

  private rotateCandleBuckets(): void {
    const now = Date.now()

    for (const [slug, bucket] of this.candles.entries()) {
      // Emit the closed candle
      this.emitCandle(slug, bucket, true)

      // Start new bucket with current close as new open
      this.candles.set(slug, {
        openTime: now,
        open: bucket.close,
        high: bucket.close,
        low: bucket.close,
        close: bucket.close,
        tickCount: 0,
      })
    }
  }

  private emitCandle(slug: string, bucket: CandleBucket, isClosed: boolean): void {
    const candle: CandleDTO = {
      symbol: toSymbol(slug),
      openTime: bucket.openTime,
      open: bucket.open,
      high: bucket.high,
      low: bucket.low,
      close: bucket.close,
      volume: bucket.tickCount,   // Use tick count as volume proxy
      isClosed,
    }

    this.emitMessage({ _parsed: true, kind: 'candle', data: candle })
  }

  // ── History Backfill ────────────────────────────────────────────────────────
  // Fetches 2 hours of 1-minute price history per slug and emits them as
  // closed CandleDTO objects so time-range filters have real data immediately.

  private async backfillHistory(): Promise<void> {
    const start = Date.now() - 2 * 60 * 60_000   // 2 hours ago
    console.info(`[CoinCap] Backfilling history for: ${this.slugs.join(', ')}`)

    for (const slug of this.slugs) {
      try {
        const url = `${COINCAP_REST}/${slug}/history?interval=m1&start=${start}&end=${Date.now()}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        })

        if (!res.ok) {
          console.warn(`[CoinCap] History ${res.status} for ${slug}`)
          continue
        }

        const json = await res.json() as { data: Array<{ priceUsd: string; time: number }> }
        const points = json.data
        if (!points?.length) continue

        for (const point of points) {
          const price = parseFloat(point.priceUsd)
          if (isNaN(price) || price <= 0) continue

          const candle: CandleDTO = {
            symbol: toSymbol(slug),
            openTime: point.time,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0,
            isClosed: true,
          }
          this.emitMessage({ _parsed: true, kind: 'candle', data: candle })
        }

        console.info(`[CoinCap] Backfilled ${points.length} points for ${slug}`)
      } catch (err) {
        console.warn(`[CoinCap] History backfill failed for ${slug}:`, err)
      }
    }
  }

  // ── REST Polling for Full Asset Data ───────────────────────────────────────

  private async fetchAssets(): Promise<void> {
    try {
      const url = `${COINCAP_REST}?ids=${this.slugs.join(',')}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      })

      if (!response.ok) {
        console.warn(`[CoinCap] REST ${response.status}: ${response.statusText}`)
        return
      }

      const json = await response.json() as { data: CoinCapAsset[] }

      for (const asset of json.data) {
        this.lastAssetData.set(asset.id, asset)

        const symbol = toSymbol(asset.id)
        const lastPrice = parseFloat(asset.priceUsd) || 0
        const changePercent = parseFloat(asset.changePercent24Hr ?? '0')
        const volume = parseFloat(asset.volumeUsd24Hr ?? '0')
        const openPrice = lastPrice / (1 + changePercent / 100)

        const ticker: TickerDTO = {
          symbol,
          lastPrice,
          priceChange: lastPrice - openPrice,
          priceChangePercent: changePercent,
          highPrice: lastPrice,   // CoinCap v2 doesn't give 24h high/low directly
          lowPrice: lastPrice,
          volume,
          quoteVolume: volume,
          openTime: 0,
          closeTime: Date.now(),
        }

        this.emitMessage({ _parsed: true, kind: 'ticker', data: ticker })
      }
    } catch (err) {
      console.warn(`[CoinCap] REST fetch failed:`, err)
    }
  }

  // ── Timers ─────────────────────────────────────────────────────────────────

  private startRestPolling(): void {
    this.stopRestPolling()
    this.restTimer = setInterval(() => this.fetchAssets(), this.restPollMs)
  }

  private stopRestPolling(): void {
    if (this.restTimer) { clearInterval(this.restTimer); this.restTimer = null }
  }

  private startCandleRotation(): void {
    this.stopCandleRotation()
    this.candleTimer = setInterval(() => this.rotateCandleBuckets(), this.candleMs)
  }

  private stopCandleRotation(): void {
    if (this.candleTimer) { clearInterval(this.candleTimer); this.candleTimer = null }
  }

  // ── Reconnect ──────────────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnect) {
      console.error(`[CoinCap] Max reconnect attempts reached`)
      this.emitStatus('failed')
      return
    }

    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), 30_000)
    this.reconnectAttempts++
    console.info(`[CoinCap] Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnect})`)

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) this.connect()
    }, delay)
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  disconnect(): void {
    this.shouldReconnect = false
    this.stopRestPolling()
    this.stopCandleRotation()
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.candles.clear()
    this.lastAssetData.clear()
    this.emitStatus('disconnected')
  }

  pause(): void {
    this.isPaused = true
    this.stopRestPolling()
    this.emitStatus('paused')
  }

  resume(): void {
    this.isPaused = false
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.emitStatus('connected')
      this.startRestPolling()
    } else {
      this.connect()
    }
  }
}
