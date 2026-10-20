import api from '@core/lib/api-client'
import type { ToothCondition } from '@/types/specialty'

export function getToothConditions(patientId: string): Promise<ToothCondition[]> {
  return api.get<ToothCondition[]>(`/api/tooth-conditions?patientId=${encodeURIComponent(patientId)}`)
}

export function upsertToothCondition(data: {
  patientId: string
  toothNumber: number
  condition: ToothCondition['condition']
  notes?: string
}): Promise<ToothCondition> {
  return api.put<ToothCondition>('/api/tooth-conditions', data)
}

export function deleteToothCondition(id: string): Promise<void> {
  return api.delete(`/api/tooth-conditions/${id}`)
}
