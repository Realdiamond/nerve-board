// ─── WindowedBuffer ───────────────────────────────────────────────────────────
// Rolling window buffer for time-series data (candles, chart points).
// Maintains chronological order. Trims oldest entries when capacity is exceeded.
//
// Unlike CircularBuffer, this preserves insertion order (oldest→newest)
// because charts need data in chronological sequence.

export class WindowedBuffer<T> {
  private items: T[] = []
  private readonly capacity: number

  constructor(capacity: number) {
    if (capacity < 1) throw new Error('WindowedBuffer capacity must be >= 1')
    this.capacity = capacity
  }

  // ── Append a single item ───────────────────────────────────────────────────

  push(item: T): void {
    this.items.push(item)
    this.trim()
  }

  // ── Append multiple items ──────────────────────────────────────────────────

  pushMany(items: T[]): void {
    this.items.push(...items)
    this.trim()
  }

  // ── Update or append (useful for candles that update in-place until closed)

  upsert(item: T, matchFn: (existing: T) => boolean): void {
    const idx = this.items.findIndex(matchFn)
    if (idx >= 0) {
      this.items[idx] = item
    } else {
      this.items.push(item)
      this.trim()
    }
  }

  // ── Get all items (chronological: oldest → newest) ─────────────────────────

  toArray(): T[] {
    return [...this.items]
  }

  // ── Get latest N items ─────────────────────────────────────────────────────

  latest(n: number): T[] {
    return this.items.slice(-n)
  }

  // ── Get last item ─────────────────────────────────────────────────────────

  last(): T | undefined {
    return this.items[this.items.length - 1]
  }

  // ── Properties ─────────────────────────────────────────────────────────────

  get size(): number {
    return this.items.length
  }

  get maxSize(): number {
    return this.capacity
  }

  // ── Clear ──────────────────────────────────────────────────────────────────

  clear(): void {
    this.items = []
  }

  // ── Internal: trim oldest entries ──────────────────────────────────────────

  private trim(): void {
    if (this.items.length > this.capacity) {
      this.items = this.items.slice(-this.capacity)
    }
  }
}
