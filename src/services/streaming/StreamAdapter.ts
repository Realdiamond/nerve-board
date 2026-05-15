// ─── StreamAdapter ────────────────────────────────────────────────────────────
// Abstract base class for all stream providers.
// Concrete adapters: WebSocketAdapter, MockStreamAdapter, SSEAdapter, PollingAdapter
// ZERO Vue dependency — this is Layer 1 code.

export type StreamStatus = 
  | 'idle' 
  | 'connecting' 
  | 'connected' 
  | 'degraded' 
  | 'reconnecting' 
  | 'fallback-mock' 
  | 'failed' 
  | 'paused' 
  | 'disconnected' 
  | 'error'

export interface StreamAdapterConfig {
  url: string
  reconnect?: boolean
  maxReconnectAttempts?: number
  reconnectBaseDelay?: number   // ms, used for exponential backoff
}

export type MessageCallback = (raw: unknown) => void
export type StatusCallback = (status: StreamStatus) => void
export type ErrorCallback = (error: Error) => void

export abstract class StreamAdapter {
  protected config: StreamAdapterConfig
  protected status: StreamStatus = 'disconnected'

  private messageListeners: MessageCallback[] = []
  private statusListeners: StatusCallback[] = []
  private errorListeners: ErrorCallback[] = []

  constructor(config: StreamAdapterConfig) {
    this.config = config
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  abstract connect(): void
  abstract disconnect(): void
  abstract pause(): void
  abstract resume(): void

  // ── Event Registration ─────────────────────────────────────────────────────

  onMessage(cb: MessageCallback): void {
    this.messageListeners.push(cb)
  }

  onStatus(cb: StatusCallback): void {
    this.statusListeners.push(cb)
  }

  onError(cb: ErrorCallback): void {
    this.errorListeners.push(cb)
  }

  // ── Protected Emitters (used by subclasses) ────────────────────────────────

  protected emitMessage(raw: unknown): void {
    for (const cb of this.messageListeners) cb(raw)
  }

  protected emitStatus(s: StreamStatus): void {
    this.status = s
    for (const cb of this.statusListeners) cb(s)
  }

  protected emitError(err: Error): void {
    for (const cb of this.errorListeners) cb(err)
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  getStatus(): StreamStatus {
    return this.status
  }

  getUrl(): string {
    return this.config.url
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  removeAllListeners(): void {
    this.messageListeners = []
    this.statusListeners = []
    this.errorListeners = []
  }
}
