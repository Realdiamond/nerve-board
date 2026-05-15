// ─── useFormattedFeed ─────────────────────────────────────────────────────────
// Derived State Layer: transforms raw ActivityEvents → UI-ready feed items.
// Adds time-ago strings, severity color classes, and icon mapping.

import { computed } from 'vue'
import { useActivityStore } from '@/stores/activity'
import { useFilterStore } from '@/stores/filter'
import { formatTimeAgo } from '@/utils/formatters'
import type { ActivityEvent } from '@/types/activity'

export interface FeedItem extends ActivityEvent {
  timeAgo: string
  icon: string
  colorClass: string
}

const TYPE_ICONS: Record<ActivityEvent['type'], string> = {
  trade:  '💱',
  alert:  '🚨',
  system: '⚙️',
  info:   'ℹ️',
  error:  '❌',
}

const SEVERITY_COLOR: Record<ActivityEvent['severity'], string> = {
  low:    'item-low',
  medium: 'item-medium',
  high:   'item-high',
}

export function useFormattedFeed(limit = 100) {
  const activityStore = useActivityStore()
  const filterStore = useFilterStore()

  // ── Full formatted feed ───────────────────────────────────────────────────

  const feedItems = computed<FeedItem[]>(() => {
    return activityStore
      .getEvents()
      .slice(0, limit)
      .map(event => ({
        ...event,
        timeAgo:    formatTimeAgo(event.timestamp),
        icon:       TYPE_ICONS[event.type] ?? '•',
        colorClass: SEVERITY_COLOR[event.severity] ?? 'item-low',
      }))
  })

  // ── Stats ─────────────────────────────────────────────────────────────────

  const alertCount = computed(() =>
    activityStore.getEvents().filter(e => e.severity === 'high').length
  )

  const totalCount = computed(() =>
    activityStore.getEvents().length
  )

  return { feedItems, alertCount, totalCount, activeSymbol: filterStore }
}
