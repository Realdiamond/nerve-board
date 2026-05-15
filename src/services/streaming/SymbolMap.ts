// ─── SymbolMap ────────────────────────────────────────────────────────────────
// Bidirectional mapping between dashboard symbols (BTCUSDT) and CoinCap slugs (bitcoin).
// Single source of truth for symbol translation across the entire streaming layer.

const SYMBOL_TO_SLUG: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  BNBUSDT: 'binance-coin',
  SOLUSDT: 'solana',
}

const SLUG_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_TO_SLUG).map(([k, v]) => [v, k])
)

/** Convert dashboard symbol (BTCUSDT) → CoinCap slug (bitcoin) */
export function toSlug(symbol: string): string {
  return SYMBOL_TO_SLUG[symbol.toUpperCase()] ?? symbol.toLowerCase()
}

/** Convert CoinCap slug (bitcoin) → dashboard symbol (BTCUSDT) */
export function toSymbol(slug: string): string {
  return SLUG_TO_SYMBOL[slug] ?? slug.toUpperCase()
}

/** Get all CoinCap slugs for configured symbols */
export function getAllSlugs(symbols?: string[]): string[] {
  if (symbols) return symbols.map(s => toSlug(s))
  return Object.values(SYMBOL_TO_SLUG)
}

/** Get all dashboard symbols */
export function getAllSymbols(): string[] {
  return Object.keys(SYMBOL_TO_SLUG)
}
