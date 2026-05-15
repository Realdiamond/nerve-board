// ─── Canonical Tick DTO ───────────────────────────────────────────────────────
// Normalized from raw Binance trade stream message
export interface TickDTO {
  symbol: string       // e.g. "BTCUSDT"
  price: number
  quantity: number
  timestamp: number    // Unix ms
  isBuyerMaker: boolean
}

// ─── Canonical Candle DTO ─────────────────────────────────────────────────────
// Normalized from Binance kline stream message
export interface CandleDTO {
  symbol: string
  openTime: number     // Unix ms
  open: number
  high: number
  low: number
  close: number
  volume: number
  isClosed: boolean    // true when candle period is complete
}

// ─── Canonical Ticker DTO ─────────────────────────────────────────────────────
// Normalized from Binance 24hr mini-ticker stream
export interface TickerDTO {
  symbol: string
  lastPrice: number
  priceChange: number
  priceChangePercent: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  openTime: number
  closeTime: number
}

// ─── Canonical Activity DTO ───────────────────────────────────────────────────
// Internal event shape for the activity feed
export interface ActivityDTO {
  id: string
  type: 'trade' | 'alert' | 'system' | 'info' | 'error'
  message: string
  timestamp: number
  severity: 'low' | 'medium' | 'high'
  metadata?: Record<string, unknown>
}

// ─── Batch payload emitted by TickBuffer ─────────────────────────────────────
export type StreamBatch =
  | { kind: 'tick';    data: TickDTO[] }
  | { kind: 'candle';  data: CandleDTO[] }
  | { kind: 'ticker';  data: TickerDTO[] }
