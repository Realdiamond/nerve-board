import type { TickerDTO, CandleDTO, TickDTO } from './streaming'

// ─── Ticker (latest snapshot per symbol) ─────────────────────────────────────
export type Ticker = TickerDTO

// ─── Candle (OHLCV) ───────────────────────────────────────────────────────────
export type Candle = CandleDTO

// ─── Trade ────────────────────────────────────────────────────────────────────
export type Trade = TickDTO

// ─── Time Range ───────────────────────────────────────────────────────────────
export type TimeRangeKey = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | 'live'

export interface TimeRange {
  key: TimeRangeKey
  label: string
  durationMs: number   // 0 = live (no backfill)
}

export const TIME_RANGES: TimeRange[] = [
  { key: 'live', label: 'Live',    durationMs: 0 },
  { key: '1m',   label: '1 Min',   durationMs: 60_000 },
  { key: '5m',   label: '5 Min',   durationMs: 5 * 60_000 },
  { key: '15m',  label: '15 Min',  durationMs: 15 * 60_000 },
  { key: '1h',   label: '1 Hour',  durationMs: 60 * 60_000 },
  { key: '4h',   label: '4 Hours', durationMs: 4 * 60 * 60_000 },
  { key: '1d',   label: '1 Day',   durationMs: 24 * 60 * 60_000 },
]

// ─── Supported symbols ────────────────────────────────────────────────────────
export const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'] as const
export type Symbol = typeof DEFAULT_SYMBOLS[number]
