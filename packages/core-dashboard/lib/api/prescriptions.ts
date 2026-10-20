import api from '../api-client'
import type { Prescription } from '@core/types'

export function getPrescriptions(params?: { patientId?: string; doctorId?: string }): Promise<Prescription[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Prescription[]>(`/api/prescriptions${q ? '?' + q : ''}`)
}

export function getPrescription(id: string): Promise<Prescription> {
  return api.get<Prescription>(`/api/prescriptions/${id}`)
}

export function createPrescription(data: Omit<Prescription, 'id'>): Promise<Prescription> {
  return api.post<Prescription>('/api/prescriptions', data)
}

export function deletePrescription(id: string): Promise<void> {
  return api.delete(`/api/prescriptions/${id}`)
}
