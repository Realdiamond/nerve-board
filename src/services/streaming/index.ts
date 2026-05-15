// ─── Streaming Layer — Barrel Export ──────────────────────────────────────────
export { StreamAdapter } from './StreamAdapter'
export type { StreamAdapterConfig, StreamStatus, MessageCallback, StatusCallback, ErrorCallback } from './StreamAdapter'

export { MockStreamAdapter } from './MockStreamAdapter'

export { CoinCapAdapter } from './CoinCapAdapter'
export type { CoinCapAdapterConfig } from './CoinCapAdapter'


export { toSlug, toSymbol, getAllSlugs, getAllSymbols } from './SymbolMap'

export { DataValidator } from './DataValidator'
export type { ValidationResult } from './DataValidator'

export { MessageParser } from './MessageParser'
export type { ParsedMessage } from './MessageParser'

export { TickBuffer } from './TickBuffer'
export type { FlushCallback } from './TickBuffer'

export { ConnectionManager } from './ConnectionManager'
export type { ConnectionStatusCallback, ActivityEventCallback } from './ConnectionManager'
