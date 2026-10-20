import api from '../api-client'
import type { Appointment } from '@core/types'

export function getAppointments(params?: {
  date?: string
  doctorId?: string
  patientId?: string
  status?: string
}): Promise<Appointment[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Appointment[]>(`/api/appointments${q ? '?' + q : ''}`)
}

export function getAppointment(id: string): Promise<Appointment> {
  return api.get<Appointment>(`/api/appointments/${id}`)
}

export function createAppointment(data: Omit<Appointment, 'id'>): Promise<Appointment> {
  return api.post<Appointment>('/api/appointments', data)
}

export function updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
  return api.put<Appointment>(`/api/appointments/${id}`, data)
}

export function deleteAppointment(id: string): Promise<void> {
  return api.delete(`/api/appointments/${id}`)
}
