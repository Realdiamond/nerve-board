// ─── CircularBuffer ───────────────────────────────────────────────────────────
// Fixed-size ring buffer. When full, oldest entries are overwritten.
// Used for: activity feed, recent trades — anywhere we need bounded memory.
//
// Performance: O(1) push, O(n) toArray. No splice, no shift.

export class CircularBuffer<T> {
  private items: (T | undefined)[]
  private head = 0       // next write position
  private count = 0
  private readonly capacity: number

  constructor(capacity: number) {
    if (capacity < 1) throw new Error('CircularBuffer capacity must be >= 1')
    this.capacity = capacity
    this.items = new Array(capacity)
  }

  // ── Push (O(1)) ────────────────────────────────────────────────────────────

  push(item: T): void {
    this.items[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }

  // ── Push multiple items ────────────────────────────────────────────────────

  pushMany(items: T[]): void {
    for (const item of items) {
      this.push(item)
    }
  }

  // ── Convert to array (newest first) ────────────────────────────────────────

  toArray(): T[] {
    if (this.count === 0) return []

    const result: T[] = new Array(this.count)
    for (let i = 0; i < this.count; i++) {
      // Walk backwards from head
      const idx = (this.head - 1 - i + this.capacity) % this.capacity
      result[i] = this.items[idx] as T
    }
    return result
  }

  // ── Get latest item ────────────────────────────────────────────────────────

  latest(): T | undefined {
    if (this.count === 0) return undefined
    return this.items[(this.head - 1 + this.capacity) % this.capacity]
  }

  // ── Properties ─────────────────────────────────────────────────────────────

  get size(): number {
    return this.count
  }

  get maxSize(): number {
    return this.capacity
  }

  get isFull(): boolean {
    return this.count === this.capacity
  }

  // ── Clear ──────────────────────────────────────────────────────────────────

  clear(): void {
    this.items = new Array(this.capacity)
    this.head = 0
    this.count = 0
  }
}
