import api from '../api-client'
import type { Patient } from '@core/types'

export function getPatients(params?: { search?: string; status?: string }): Promise<Patient[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Patient[]>(`/api/patients${q ? '?' + q : ''}`)
}

export function getArchivedPatients(params?: { search?: string }): Promise<Patient[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Patient[]>(`/api/patients/archived${q ? '?' + q : ''}`)
}

export function getPatient(id: string): Promise<Patient> {
  return api.get<Patient>(`/api/patients/${id}`)
}

export function createPatient(data: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> {
  return api.post<Patient>('/api/patients', data)
}

export function updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
  return api.put<Patient>(`/api/patients/${id}`, data)
}

export function deletePatient(id: string): Promise<void> {
  return api.delete(`/api/patients/${id}`)
}

export function archivePatient(id: string): Promise<Patient> {
  return api.post<Patient>(`/api/patients/${id}/archive`, {})
}

export function restorePatient(id: string): Promise<Patient> {
  return api.post<Patient>(`/api/patients/${id}/restore`, {})
}

export interface PortalAccountStatus {
  status: 'ftuar' | 'aktiv' | 'çaktivizuar'
  email: string
  invited_at: string | null
  activated_at: string | null
  last_login_at: string | null
}

export function getPortalStatus(patientId: string): Promise<{ account: PortalAccountStatus | null }> {
  return api.get(`/api/portal-admin/patients/${patientId}/status`)
}

export function enablePortalAccess(patientId: string, email?: string): Promise<{ emailSent: boolean; inviteUrl?: string }> {
  return api.post(`/api/portal-admin/patients/${patientId}/enable`, email ? { email } : {})
}

export function resendPortalInvite(patientId: string): Promise<{ emailSent: boolean; inviteUrl?: string }> {
  return api.post(`/api/portal-admin/patients/${patientId}/resend-invite`, {})
}

export function revokePortalAccess(patientId: string): Promise<{ message: string }> {
  return api.post(`/api/portal-admin/patients/${patientId}/revoke`, {})
}

export async function exportPatientPdf(id: string, name: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') throw new Error('Eksportimi i PDF-ve nuk është i disponueshëm në demo')
  const token = typeof window !== 'undefined' ? localStorage.getItem('hypocrates_token') : null
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  const res = await fetch(`${base}/api/patients/${id}/export-pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `pacient_${name}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// GDPR data-portability export — full machine-readable JSON of everything
// the system holds about one patient, distinct from the formatted PDF above.
export async function exportPatientData(id: string, name: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') throw new Error('Eksportimi i të dhënave nuk është i disponueshëm në demo')
  const token = typeof window !== 'undefined' ? localStorage.getItem('hypocrates_token') : null
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  const res = await fetch(`${base}/api/patients/${id}/export-data`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `pacient_${name}_te-dhenat.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Right to be forgotten — scrubs PII, deletes uploaded documents, revokes
// portal access. Not reversible; the API requires a non-empty reason.
export function anonymizePatient(id: string, reason: string): Promise<Patient> {
  return api.post<Patient>(`/api/patients/${id}/anonymize`, { reason })
}
