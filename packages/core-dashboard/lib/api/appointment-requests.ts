import api from '../api-client'

export interface StaffAppointmentRequest {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  preferredDate?: string
  preferredTime?: string
  reason?: string
  doctorId?: string
  doctorName?: string
  clinicName?: string
  status: 'ne_pritje' | 'miratuar' | 'refuzuar' | 'anuluar'
  staffNote?: string
  createdAt: string
}

export function getAppointmentRequests(status?: string): Promise<StaffAppointmentRequest[]> {
  const q = status ? `?status=${status}` : ''
  return api.get(`/api/portal-admin/appointment-requests${q}`)
}

export function approveAppointmentRequest(id: string, data: {
  date: string
  time: string
  duration?: number
  doctorId: string
  type: string
  notes?: string
}): Promise<{ appointmentId: string; message: string }> {
  return api.post(`/api/portal-admin/appointment-requests/${id}/approve`, data)
}

export function rejectAppointmentRequest(id: string, staffNote?: string): Promise<{ message: string }> {
  return api.post(`/api/portal-admin/appointment-requests/${id}/reject`, { staffNote })
}
