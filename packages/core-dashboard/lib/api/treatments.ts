import api from '../api-client'
import type { Treatment } from '@core/types'

export interface TreatmentStats {
  type: string
  count: number
  avgCost: number | null
  minCost: number | null
  maxCost: number | null
}

export function getTreatments(params?: { patientId?: string; doctorId?: string; status?: string }): Promise<Treatment[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Treatment[]>(`/api/treatments${q ? '?' + q : ''}`)
}

// Plain historical average cost (no AI/ML) for a given treatment type name,
// computed from completed treatments — used to show a live cost estimate
// while building a new treatment.
export function getTreatmentStats(type: string): Promise<TreatmentStats> {
  return api.get<TreatmentStats>(`/api/treatments/stats?type=${encodeURIComponent(type)}`)
}

export function getTreatment(id: string): Promise<Treatment> {
  return api.get<Treatment>(`/api/treatments/${id}`)
}

export function createTreatment(data: Omit<Treatment, 'id'>): Promise<Treatment> {
  return api.post<Treatment>('/api/treatments', data)
}

export function updateTreatment(id: string, data: Partial<Treatment>): Promise<Treatment> {
  return api.put<Treatment>(`/api/treatments/${id}`, data)
}

export function deleteTreatment(id: string): Promise<void> {
  return api.delete(`/api/treatments/${id}`)
}
