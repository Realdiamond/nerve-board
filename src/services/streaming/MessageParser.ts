// ─── MessageParser ────────────────────────────────────────────────────────────
// Canonical message normalization layer.
// Everything downstream uses TickDTO | CandleDTO | TickerDTO | ActivityDTO.

import type { TickDTO, CandleDTO, TickerDTO, ActivityDTO } from '@/types/streaming'

export type ParsedMessage =
  | { kind: 'tick';     data: TickDTO }
  | { kind: 'candle';   data: CandleDTO }
  | { kind: 'ticker';   data: TickerDTO }
  | { kind: 'activity'; data: ActivityDTO }
  | null    // null = unparsable / rejected

export class MessageParser {
  // ── Main parse entry ───────────────────────────────────────────────────────

  static parse(raw: unknown): ParsedMessage {
    // Pre-parsed messages (from adapters like CoinCapAdapter or MockStreamAdapter)
    if (raw && typeof raw === 'object' && '_parsed' in raw) {
      const msg = raw as { _parsed: true; kind: string; data: unknown }
      if (msg.kind === 'tick' || msg.kind === 'candle' || msg.kind === 'ticker' || msg.kind === 'activity') {
        return { kind: msg.kind, data: msg.data } as NonNullable<ParsedMessage>
      }
    }

    return null
  }

  // ── Create system ActivityDTO (for connection events etc.) ─────────────────

  static createSystemEvent(message: string, severity: ActivityDTO['severity'] = 'low'): ActivityDTO {
    return {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'system',
      message,
      timestamp: Date.now(),
      severity,
    }
  }
}

