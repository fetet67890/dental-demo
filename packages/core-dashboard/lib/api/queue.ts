import api from '../api-client'

export type { QueueEntry } from './queue.types'
import type { QueueEntry } from './queue.types'

export function getQueue(includeDone = false): Promise<QueueEntry[]> {
  return api.get<QueueEntry[]>(`/api/queue${includeDone ? '?includeDone=true' : ''}`)
}

export function addToQueue(data: { patientId: string; priority?: boolean; notes?: string }): Promise<QueueEntry> {
  return api.post<QueueEntry>('/api/queue', data)
}

export function callFromQueue(id: string, doctorId: string): Promise<QueueEntry> {
  return api.patch<QueueEntry>(`/api/queue/${id}/call`, { doctorId })
}

export function updateQueueStatus(id: string, status: QueueEntry['status']): Promise<QueueEntry> {
  return api.patch<QueueEntry>(`/api/queue/${id}/status`, { status })
}

export function removeFromQueue(id: string): Promise<void> {
  return api.delete(`/api/queue/${id}`)
}
