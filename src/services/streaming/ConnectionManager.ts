// ─── ConnectionManager ────────────────────────────────────────────────────────
// Orchestrates multiple StreamAdapter instances.
// Manages lifecycle: start all, stop all, pause, resume.
// Wires each adapter → MessageParser → TickBuffer.

import type { StreamAdapter, StreamStatus } from './StreamAdapter'
import { MessageParser } from './MessageParser'
import { TickBuffer } from './TickBuffer'
import type { ParsedMessage } from './MessageParser'

export type ConnectionStatusCallback = (status: StreamStatus) => void
export type ActivityEventCallback = (msg: string, severity: 'low' | 'medium' | 'high') => void

export class ConnectionManager {
  private adapters: StreamAdapter[] = []
  private buffer: TickBuffer
  private statusListeners: ConnectionStatusCallback[] = []
  private activityListeners: ActivityEventCallback[] = []

  constructor() {
    this.buffer = new TickBuffer()
  }

  // ── Register adapters ──────────────────────────────────────────────────────

  addAdapter(adapter: StreamAdapter): void {
    this.adapters.push(adapter)

    // Wire: adapter.onMessage → parse → buffer.push
    adapter.onMessage((raw: unknown) => {
      const parsed: ParsedMessage = MessageParser.parse(raw)
      if (parsed) {
        this.buffer.push(parsed)
      }
    })

    // Wire: adapter status → notify listeners + activity feed
    adapter.onStatus((status: StreamStatus) => {
      for (const cb of this.statusListeners) cb(status)

      // Log connection events to activity feed
      const url = adapter.getUrl()
      const shortUrl = url.length > 40 ? '...' + url.slice(-30) : url
      switch (status) {
        case 'connected':
          this.emitActivity(`Connected to ${shortUrl}`, 'low')
          break
        case 'disconnected':
          this.emitActivity(`Disconnected from ${shortUrl}`, 'medium')
          break
        case 'error':
          this.emitActivity(`Connection error: ${shortUrl}`, 'high')
          break
      }
    })

    adapter.onError((err: Error) => {
      this.emitActivity(`Stream error: ${err.message}`, 'high')
    })
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async startAll(staggerMs = 200): Promise<void> {
    this.buffer.start()
    for (let i = 0; i < this.adapters.length; i++) {
      if (staggerMs > 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, staggerMs))
      }
      this.adapters[i].connect()
    }
  }

  stopAll(): void {
    for (const adapter of this.adapters) {
      adapter.disconnect()
    }
    this.buffer.stop()
  }

  pauseAll(): void {
    for (const adapter of this.adapters) {
      adapter.pause()
    }
  }

  resumeAll(): void {
    for (const adapter of this.adapters) {
      adapter.resume()
    }
  }

  // ── Buffer access ──────────────────────────────────────────────────────────

  getBuffer(): TickBuffer {
    return this.buffer
  }

  // ── Event registration ─────────────────────────────────────────────────────

  onStatus(cb: ConnectionStatusCallback): void {
    this.statusListeners.push(cb)
  }

  onActivity(cb: ActivityEventCallback): void {
    this.activityListeners.push(cb)
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private emitActivity(message: string, severity: 'low' | 'medium' | 'high'): void {
    for (const cb of this.activityListeners) cb(message, severity)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.stopAll()
    for (const adapter of this.adapters) {
      adapter.removeAllListeners()
    }
    this.buffer.destroy()
    this.adapters = []
    this.statusListeners = []
    this.activityListeners = []
  }
}
