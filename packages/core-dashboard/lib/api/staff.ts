import api from '../api-client'
import type { Staff } from '@core/types'

export type CreateStaffData = Omit<Staff, 'id' | 'joinedAt'> & { password: string }

export function getStaff(params?: { role?: string; status?: string; search?: string }): Promise<Staff[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Staff[]>(`/api/staff${q ? '?' + q : ''}`)
}

export function getStaffMember(id: string): Promise<Staff> {
  return api.get<Staff>(`/api/staff/${id}`)
}

export function createStaff(data: CreateStaffData): Promise<Staff> {
  return api.post<Staff>('/api/staff', data)
}

export function updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
  return api.put<Staff>(`/api/staff/${id}`, data)
}

export function resetStaffPassword(id: string, newPassword: string): Promise<{ message: string }> {
  return api.patch(`/api/staff/${id}/password`, { newPassword })
}

export function deleteStaff(id: string): Promise<void> {
  return api.delete(`/api/staff/${id}`)
}

export async function uploadStaffAvatar(id: string, file: File): Promise<Staff> {
  const fd = new FormData()
  fd.append('file', file)
  return api.upload<Staff>(`/api/staff/${id}/avatar`, fd)
}

export interface StaffCommissionRate {
  id: string
  serviceId: string
  serviceName: string
  rate: number
}

export function getStaffCommissionRates(staffId: string): Promise<StaffCommissionRate[]> {
  return api.get<StaffCommissionRate[]>(`/api/staff/${staffId}/commission-rates`)
}

export function setStaffCommissionRates(staffId: string, rates: { serviceId: string; rate: number }[]): Promise<StaffCommissionRate[]> {
  return api.put<StaffCommissionRate[]>(`/api/staff/${staffId}/commission-rates`, { rates })
}
