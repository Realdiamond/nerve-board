import type { ActivityDTO } from './streaming'

export type ActivityEvent = ActivityDTO

export type SeverityLevel = ActivityEvent['severity']
export type EventType = ActivityEvent['type']
