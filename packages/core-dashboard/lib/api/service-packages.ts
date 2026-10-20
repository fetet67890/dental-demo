import api from '../api-client'

export type { ServicePackage } from './service-packages.types'
import type { ServicePackage } from './service-packages.types'

export function getServicePackages(opts?: { activeOnly?: boolean }): Promise<ServicePackage[]> {
  const q = opts?.activeOnly ? '?activeOnly=true' : ''
  return api.get<ServicePackage[]>(`/api/service-packages${q}`)
}

export function createServicePackage(data: {
  name: string; description?: string; serviceId: string; sessionCount: number; price: number
  validityDays?: number; sortOrder?: number; isActive?: boolean
}): Promise<ServicePackage> {
  return api.post<ServicePackage>('/api/service-packages', data)
}

export function updateServicePackage(id: string, data: Partial<Omit<ServicePackage, 'id'>>): Promise<ServicePackage> {
  return api.put<ServicePackage>(`/api/service-packages/${id}`, data)
}

export function deleteServicePackage(id: string): Promise<void> {
  return api.delete(`/api/service-packages/${id}`)
}
