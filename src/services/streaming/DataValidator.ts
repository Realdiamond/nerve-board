// ─── DataValidator ────────────────────────────────────────────────────────────
// Sanitises and validates incoming payloads.
// Rejects malformed data, prevents unsafe injection.

export interface ValidationResult<T = unknown> {
  valid: boolean
  data: T | null
  error?: string
}

export class DataValidator {
  // ── Validate raw WebSocket payload ─────────────────────────────────────────
  // Ensures it's a non-null object (not array, not primitive)
  static validatePayload(raw: unknown): ValidationResult<Record<string, unknown>> {
    if (raw === null || raw === undefined) {
      return { valid: false, data: null, error: 'Payload is null/undefined' }
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      return { valid: false, data: null, error: 'Payload is not an object' }
    }

    return { valid: true, data: raw as Record<string, unknown> }
  }

  // ── Validate required numeric field ────────────────────────────────────────
  static isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value)
  }

  // ── Validate required string field ─────────────────────────────────────────
  static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0
  }

  // ── Sanitise string (strip potential XSS) ──────────────────────────────────
  static sanitiseString(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }
}

