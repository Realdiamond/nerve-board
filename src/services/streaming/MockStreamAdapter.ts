// ─── MockStreamAdapter ────────────────────────────────────────────────────────
// Generates realistic simulated market data for development and testing.
// Implements the same StreamAdapter interface as CoinCapAdapter.

import { StreamAdapter } from './StreamAdapter'
import type { StreamAdapterConfig } from './StreamAdapter'
import type { TickDTO, CandleDTO, TickerDTO } from '@/types/streaming'

interface MockConfig extends StreamAdapterConfig {
  symbols?: string[]
  tickIntervalMs?: number   // how often to generate a tick (default: 500ms)
  volatility?: number       // price change per tick as % (default: 0.15)
}

// ── Simulated base prices per symbol ─────────────────────────────────────────
const BASE_PRICES: Record<string, number> = {
  BTCUSDT: 67_500,
  ETHUSDT: 3_450,
  BNBUSDT: 580,
  SOLUSDT: 148,
}

export class MockStreamAdapter extends StreamAdapter {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isPaused = false
  private prices: Record<string, number> = {}
  private readonly symbols: string[]
  private readonly tickInterval: number
  private readonly volatility: number

  constructor(config: MockConfig) {
    super({ ...config, url: config.url || 'mock://local' })
    this.symbols = config.symbols ?? Object.keys(BASE_PRICES)
    this.tickInterval = config.tickIntervalMs ?? 500
    this.volatility = config.volatility ?? 0.15

    // Initialise simulated prices
    for (const sym of this.symbols) {
      this.prices[sym] = BASE_PRICES[sym] ?? 100
    }
  }

  connect(): void {
    this.emitStatus('connecting')

    // Simulate a short connection delay
    setTimeout(() => {
      this.emitStatus('connected')
      this.startGenerating()
    }, 300)
  }

  disconnect(): void {
    this.stopGenerating()
    this.emitStatus('disconnected')
  }

  pause(): void {
    this.isPaused = true
    this.emitStatus('paused')
  }

  resume(): void {
    this.isPaused = false
    this.emitStatus('connected')
  }

  // ── Internal: generate ticks on interval ───────────────────────────────────

  private startGenerating(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      if (this.isPaused) return

      for (const sym of this.symbols) {
        this.generateTrade(sym)
      }

      // Emit a candle every ~5 ticks
      if (Math.random() < 0.2) {
        const sym = this.symbols[Math.floor(Math.random() * this.symbols.length)]
        this.generateCandle(sym)
      }

      // Emit ticker for all symbols every ~3 ticks
      if (Math.random() < 0.33) {
        for (const sym of this.symbols) {
          this.generateTicker(sym)
        }
      }
    }, this.tickInterval)
  }

  private stopGenerating(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // ── Generators (emit Canonical DTOs) ───────────────────────────────────────

  private generateTrade(symbol: string): void {
    this.walkPrice(symbol)
    const price = this.prices[symbol]

    const tick: TickDTO = {
      symbol,
      price,
      quantity: Math.random() * 2 + 0.01,
      timestamp: Date.now(),
      isBuyerMaker: Math.random() > 0.5,
    }

    this.emitMessage({ _parsed: true, kind: 'tick', data: tick })
  }

  private generateCandle(symbol: string): void {
    const price = this.prices[symbol]
    const spread = price * (this.volatility / 100) * 2

    const candle: CandleDTO = {
      symbol,
      openTime: Date.now() - 60_000,
      open: price - spread * Math.random(),
      high: price + spread * Math.random(),
      low: price - spread * Math.random(),
      close: price,
      volume: Math.random() * 100 + 10,
      isClosed: Math.random() < 0.1,
    }

    this.emitMessage({ _parsed: true, kind: 'candle', data: candle })
  }

  private generateTicker(symbol: string): void {
    const price = this.prices[symbol]
    const openPrice = price * (1 - (Math.random() * 0.02 - 0.01))
    const priceChange = price - openPrice

    const ticker: TickerDTO = {
      symbol,
      lastPrice: price,
      priceChange,
      priceChangePercent: (priceChange / openPrice) * 100,
      highPrice: price * 1.02,
      lowPrice: price * 0.98,
      volume: Math.random() * 10000 + 1000,
      quoteVolume: Math.random() * 500000 + 50000,
      openTime: 0,
      closeTime: Date.now(),
    }

    this.emitMessage({ _parsed: true, kind: 'ticker', data: ticker })
  }

  // ── Random walk ────────────────────────────────────────────────────────────

  private walkPrice(symbol: string): void {
    const current = this.prices[symbol]
    const change = current * (this.volatility / 100) * (Math.random() * 2 - 1)
    this.prices[symbol] = Math.max(0.01, current + change)
  }
}

