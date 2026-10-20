import api from '../api-client'
import type { OrthoProgression } from '@core/types'

export function getOrthoProgressions(params?: { patientId?: string; doctorId?: string }): Promise<OrthoProgression[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<OrthoProgression[]>(`/api/ortho-progressions${q ? '?' + q : ''}`)
}

export function createOrthoProgression(data: { patientId: string; doctorId: string; treatmentId?: string; stageLabel: string; stageDate: string; notes?: string }): Promise<OrthoProgression> {
  return api.post<OrthoProgression>('/api/ortho-progressions', data)
}

export function updateOrthoProgression(id: string, data: Partial<Pick<OrthoProgression, 'stageLabel' | 'stageDate' | 'notes'>>): Promise<OrthoProgression> {
  return api.put<OrthoProgression>(`/api/ortho-progressions/${id}`, data)
}

export function deleteOrthoProgression(id: string): Promise<void> {
  return api.delete(`/api/ortho-progressions/${id}`)
}
