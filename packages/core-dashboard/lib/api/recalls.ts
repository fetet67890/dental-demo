import api from '../api-client'

export interface RecallSettings {
  intervalMonths: number
  enabled: boolean
}

export interface DuePatient {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  lastVisit: string | null
}

export function getRecallSettings(): Promise<RecallSettings> {
  return api.get<RecallSettings>('/api/recalls/settings')
}

export function updateRecallSettings(data: Partial<RecallSettings>): Promise<RecallSettings> {
  return api.put<RecallSettings>('/api/recalls/settings', data)
}

export function getDueRecalls(): Promise<{ intervalMonths: number; count: number; patients: DuePatient[] }> {
  return api.get('/api/recalls/due')
}

export function sendRecalls(): Promise<{ skipped: boolean; sent: number; failed: number; total?: number }> {
  return api.post('/api/recalls/send', {})
}
