import api from '../api-client'
import type { PatientService } from '@core/types'

export function getPatientServices(params?: { patientId?: string; invoiced?: string; doctorId?: string }): Promise<PatientService[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<PatientService[]>(`/api/patient-services${q ? '?' + q : ''}`)
}

export function createPatientService(data: Omit<PatientService, 'id'>): Promise<PatientService> {
  return api.post<PatientService>('/api/patient-services', data)
}

export function deletePatientService(id: string): Promise<void> {
  return api.delete(`/api/patient-services/${id}`)
}

export function markPatientServiceInvoiced(id: string, invoiceId?: string): Promise<void> {
  return api.patch(`/api/patient-services/${id}/mark-invoiced`, { invoiceId })
}
