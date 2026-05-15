import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { ActivityEvent } from '@/types/activity'
import { CircularBuffer } from '@/utils/CircularBuffer'

const MAX_EVENTS = 200

export const useActivityStore = defineStore('activity', () => {
  const buffer = new CircularBuffer<ActivityEvent>(MAX_EVENTS)

  // Version ref to trigger reactivity (buffer itself is non-reactive)
  const version = shallowRef(0)

  function push(event: ActivityEvent): void {
    buffer.push(event)
    version.value++
  }

  function pushBatch(batch: ActivityEvent[]): void {
    buffer.pushMany(batch)
    version.value++
  }

  // ── Accessor (newest first — CircularBuffer.toArray does this) ─────────────

  function getEvents(): ActivityEvent[] {
    void version.value   // reactive dependency
    return buffer.toArray()
  }

  function clear(): void {
    buffer.clear()
    version.value++
  }

  return { version, push, pushBatch, getEvents, clear }
})
