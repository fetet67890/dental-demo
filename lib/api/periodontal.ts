import api from '@core/lib/api-client'

export interface PeriodontalRecord {
  id: string
  patientId: string
  toothNumber: number
  pocketDepth: number
  recession: number
  bleeding: boolean
  notes?: string
  recordedBy?: string
  recordedAt: string
}

export function getPeriodontalRecords(patientId: string): Promise<PeriodontalRecord[]> {
  return api.get<PeriodontalRecord[]>(`/api/periodontal?patientId=${encodeURIComponent(patientId)}`)
}

export function createPeriodontalRecord(data: {
  patientId: string; toothNumber: number; pocketDepth: number; recession?: number; bleeding?: boolean; notes?: string; recordedAt: string
}): Promise<PeriodontalRecord> {
  return api.post<PeriodontalRecord>('/api/periodontal', data)
}

export function deletePeriodontalRecord(id: string): Promise<void> {
  return api.delete(`/api/periodontal/${id}`)
}
