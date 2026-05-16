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

const COINCAP_REST = 'https://rest.coincap.io/v3/assets'

export class CoinCapAdapter extends StreamAdapter {
  private restTimer: ReturnType<typeof setInterval> | null = null
  private candleTimer: ReturnType<typeof setInterval> | null = null
  private hasBackfilled = false
  private isPaused = false

  private readonly slugs: string[]
  private readonly apiKey: string
  private readonly restPollMs: number
  private readonly candleMs: number

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
    this.emitStatus('connecting')

    console.info(`[CoinCap] Using REST Polling mode (WebSocket disabled by API tier)`)
    
    // Immediately "connect" via REST
    this.emitStatus('connected')

    // Start REST polling for price updates (this replaces the WS stream)
    this.startRestPolling()
    // Start candle bucket rotation
    this.startCandleRotation()
    // Initial REST fetch immediately
    this.fetchAssets()
    
    // Backfill history ONCE only
    if (!this.hasBackfilled) {
      this.hasBackfilled = true
      this.backfillHistory()
    }
  }

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
    if (this.isPaused) return
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

        // Emit ticker for the top cards
        this.emitMessage({ _parsed: true, kind: 'ticker', data: ticker })
        
        // Push this price directly into the candle bucket for the charts to update live!
        this.updateCandleBucket(asset.id, lastPrice, Date.now())
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

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  disconnect(): void {
    this.stopRestPolling()
    this.stopCandleRotation()
    this.candles.clear()
    this.lastAssetData.clear()
    this.emitStatus('disconnected')
  }

  pause(): void {
    this.isPaused = true
    this.stopRestPolling()
    this.stopCandleRotation()
    this.emitStatus('paused')
  }

  resume(): void {
    this.isPaused = false
    this.emitStatus('connected')
    this.startRestPolling()
    this.startCandleRotation()
  }
}
