import { defineStore } from 'pinia'
import { shallowRef, shallowReactive, computed } from 'vue'
import type { TickerDTO, CandleDTO, TickDTO } from '@/types/streaming'
import type { ParsedMessage } from '@/services/streaming/MessageParser'
import { WindowedBuffer } from '@/utils/WindowedBuffer'
import { CircularBuffer } from '@/utils/CircularBuffer'

const MAX_CANDLES = 500
const MAX_TRADES  = 200

export const useMarketStore = defineStore('market', () => {
  // ── State ──────────────────────────────────────────────────────────────────

  // Latest ticker snapshot per symbol (shallowReactive Map)
  const tickers = shallowReactive<Map<string, TickerDTO>>(new Map())

  // Candle buffers per symbol (managed by WindowedBuffer for chronological order)
  const candleBuffers = new Map<string, WindowedBuffer<CandleDTO>>()

  // Trade buffers per symbol (managed by CircularBuffer for newest-first)
  const tradeBuffers = new Map<string, CircularBuffer<TickDTO>>()

  // Trigger refs — bumped on each ingest so Vue knows data changed
  // (since the internal buffers are non-reactive for performance)
  const candleVersion = shallowRef(0)
  const tradeVersion = shallowRef(0)

  // ── Buffer accessors ───────────────────────────────────────────────────────

  function getCandleBuffer(symbol: string): WindowedBuffer<CandleDTO> {
    let buf = candleBuffers.get(symbol)
    if (!buf) {
      buf = new WindowedBuffer<CandleDTO>(MAX_CANDLES)
      candleBuffers.set(symbol, buf)
    }
    return buf
  }

  function getTradeBuffer(symbol: string): CircularBuffer<TickDTO> {
    let buf = tradeBuffers.get(symbol)
    if (!buf) {
      buf = new CircularBuffer<TickDTO>(MAX_TRADES)
      tradeBuffers.set(symbol, buf)
    }
    return buf
  }

  // ── Batch ingestion (called by StreamingPlugin on each TickBuffer flush) ──

  function ingestBatch(batch: NonNullable<ParsedMessage>[]): void {
    let candlesUpdated = false
    let tradesUpdated = false

    for (const msg of batch) {
      switch (msg.kind) {
        case 'ticker':
          tickers.set(msg.data.symbol, msg.data)
          break

        case 'candle': {
          const buf = getCandleBuffer(msg.data.symbol)
          // Upsert: update existing candle if same openTime, else append
          buf.upsert(msg.data, (existing) => existing.openTime === msg.data.openTime)
          candlesUpdated = true
          break
        }

        case 'tick': {
          const buf = getTradeBuffer(msg.data.symbol)
          buf.push(msg.data)
          tradesUpdated = true
          break
        }
      }
    }

    // Bump version refs to trigger Vue reactivity for watchers
    if (candlesUpdated) candleVersion.value++
    if (tradesUpdated) tradeVersion.value++
  }

  // ── Computed accessors for UI ──────────────────────────────────────────────

  function getCandles(symbol: string): CandleDTO[] {
    // Access candleVersion to create a reactive dependency
    void candleVersion.value
    return getCandleBuffer(symbol).toArray()
  }

  function getTrades(symbol: string): TickDTO[] {
    // Access tradeVersion to create a reactive dependency
    void tradeVersion.value
    return getTradeBuffer(symbol).toArray()
  }

  function getTicker(symbol: string): TickerDTO | undefined {
    return tickers.get(symbol)
  }

  // ── Derived: list of all active symbols ────────────────────────────────────

  const activeSymbols = computed(() => {
    void candleVersion.value
    return Array.from(tickers.keys())
  })

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset(): void {
    tickers.clear()
    candleBuffers.clear()
    tradeBuffers.clear()
    candleVersion.value = 0
    tradeVersion.value = 0
  }

  return {
    // State
    tickers,
    candleVersion,
    tradeVersion,

    // Actions
    ingestBatch,
    getCandles,
    getTrades,
    getTicker,
    reset,

    // Derived
    activeSymbols,
  }
})
