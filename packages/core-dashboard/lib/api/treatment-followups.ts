import api from '../api-client'
import type { TreatmentFollowup } from '@core/types'

export function getFollowups(params?: { patientId?: string; doctorId?: string; status?: string; dueBefore?: string }): Promise<TreatmentFollowup[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<TreatmentFollowup[]>(`/api/treatment-followups${q ? '?' + q : ''}`)
}

export function createFollowup(data: { treatmentId: string; patientId: string; doctorId: string; label: string; dueDate: string; notes?: string }): Promise<TreatmentFollowup> {
  return api.post<TreatmentFollowup>('/api/treatment-followups', data)
}

export function updateFollowup(id: string, data: Partial<Pick<TreatmentFollowup, 'label' | 'dueDate' | 'status' | 'notes' | 'appointmentId'>>): Promise<TreatmentFollowup> {
  return api.put<TreatmentFollowup>(`/api/treatment-followups/${id}`, data)
}

export function deleteFollowup(id: string): Promise<void> {
  return api.delete(`/api/treatment-followups/${id}`)
}
