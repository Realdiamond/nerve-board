// ─── Formatters ───────────────────────────────────────────────────────────────
// Pure utility functions for display formatting.
// No Vue imports. Used by composables and components.

// ── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// ── Compact currency (e.g. $1.2B, $340K) ────────────────────────────────────

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

// ── Number with commas ───────────────────────────────────────────────────────

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// ── Percent ──────────────────────────────────────────────────────────────────

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

// ── Volume (compact) ─────────────────────────────────────────────────────────

export function formatVolume(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

// ── Timestamp → time string ──────────────────────────────────────────────────

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// ── Timestamp → relative "time ago" ──────────────────────────────────────────

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)

  if (seconds < 5)  return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return formatTime(timestamp)
}

// ── Symbol display (BTCUSDT → BTC/USDT) ──────────────────────────────────────

export function formatSymbol(symbol: string): string {
  if (symbol.endsWith('USDT')) {
    return `${symbol.slice(0, -4)}/USDT`
  }
  return symbol
}
