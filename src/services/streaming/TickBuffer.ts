// ─── TickBuffer ───────────────────────────────────────────────────────────────
// RAF-gated batch accumulator. THE key performance mechanism.
//
// Collects incoming messages and flushes them as a single batch
// on the next requestAnimationFrame boundary (~16ms / 60fps).
//
// Result: 200+ messages/sec → 1 store mutation per frame → 1 render cycle.

import type { ParsedMessage } from './MessageParser'

export type FlushCallback = (batch: NonNullable<ParsedMessage>[]) => void

export class TickBuffer {
  private buffer: NonNullable<ParsedMessage>[] = []
  private rafId: number | null = null
  private flushListeners: FlushCallback[] = []
  private isRunning = false

  // ── Start the RAF loop ─────────────────────────────────────────────────────

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.scheduleFlush()
  }

  stop(): void {
    this.isRunning = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    // Flush remaining
    if (this.buffer.length > 0) {
      this.flush()
    }
  }

  // ── Push a parsed message into the buffer ──────────────────────────────────

  push(message: ParsedMessage): void {
    if (message === null) return
    this.buffer.push(message)
  }

  // ── Register flush listener ────────────────────────────────────────────────

  onFlush(cb: FlushCallback): void {
    this.flushListeners.push(cb)
  }

  // ── Internal: schedule flush on next animation frame ───────────────────────

  private scheduleFlush(): void {
    if (!this.isRunning) return

    this.rafId = requestAnimationFrame(() => {
      if (this.buffer.length > 0) {
        this.flush()
      }
      this.scheduleFlush()
    })
  }

  // ── Internal: emit buffered messages and clear ─────────────────────────────

  private flush(): void {
    const batch = this.buffer
    this.buffer = []   // Swap — fast, no splice/shift

    for (const cb of this.flushListeners) {
      cb(batch)
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.stop()
    this.flushListeners = []
    this.buffer = []
  }
}
