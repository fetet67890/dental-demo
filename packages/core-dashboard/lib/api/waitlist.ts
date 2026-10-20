import api from '../api-client'

export type { WaitlistEntry } from './waitlist.types'
import type { WaitlistEntry } from './waitlist.types'

export function getWaitlist(): Promise<WaitlistEntry[]> {
  return api.get<WaitlistEntry[]>('/api/waitlist')
}

export function addToWaitlist(data: { patientId: string; doctorId?: string; preferredDate?: string; notes?: string }): Promise<WaitlistEntry> {
  return api.post<WaitlistEntry>('/api/waitlist', data)
}

export function updateWaitlistStatus(id: string, status: WaitlistEntry['status']): Promise<WaitlistEntry> {
  return api.patch<WaitlistEntry>(`/api/waitlist/${id}/status`, { status })
}

export function removeFromWaitlist(id: string): Promise<void> {
  return api.delete(`/api/waitlist/${id}`)
}
