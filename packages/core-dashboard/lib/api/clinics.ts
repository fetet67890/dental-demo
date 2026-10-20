import api from '../api-client'

export interface Clinic {
  id: string
  name: string
  address: string
  phone: string
  email: string
  description: string
  isActive: boolean
  createdAt: string
}

export type ClinicInput = {
  name: string
  address?: string
  phone?: string
  email?: string
  description?: string
  isActive?: boolean
}

export function getClinics(activeOnly = false): Promise<Clinic[]> {
  return api.get(`/api/clinics${activeOnly ? '?activeOnly=1' : ''}`)
}

export function createClinic(data: ClinicInput): Promise<Clinic> {
  return api.post('/api/clinics', data)
}

export function updateClinic(id: string, data: Partial<ClinicInput>): Promise<Clinic> {
  return api.put(`/api/clinics/${id}`, data)
}

export function deleteClinic(id: string): Promise<{ message: string }> {
  return api.delete(`/api/clinics/${id}`)
}
