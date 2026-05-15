import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StreamStatus } from '@/services/streaming'

export type ConnectionStatus = StreamStatus

export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('disconnected')
  const latencyMs = ref<number>(0)
  const reconnectCount = ref<number>(0)
  const isPaused = ref<boolean>(false)
  const lastMessageAt = ref<number | null>(null)

  function setStatus(s: ConnectionStatus): void {
    status.value = s
  }

  function setLatency(ms: number): void {
    latencyMs.value = ms
  }

  function incrementReconnect(): void {
    reconnectCount.value++
  }

  function setPaused(paused: boolean): void {
    isPaused.value = paused
    status.value = paused ? 'paused' : 'connected'
  }

  function recordMessage(): void {
    lastMessageAt.value = Date.now()
  }

  return {
    status, latencyMs, reconnectCount, isPaused, lastMessageAt,
    setStatus, setLatency, incrementReconnect, setPaused, recordMessage,
  }
})
