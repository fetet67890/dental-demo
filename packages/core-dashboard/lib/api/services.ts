import api from '../api-client'
import type { Service } from '@core/types'

export function getServices(params?: { category?: string; isActive?: string }): Promise<Service[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Service[]>(`/api/services${q ? '?' + q : ''}`)
}

export function createService(data: Omit<Service, 'id'>): Promise<Service> {
  return api.post<Service>('/api/services', data)
}

export function updateService(id: string, data: Partial<Service>): Promise<Service> {
  return api.put<Service>(`/api/services/${id}`, data)
}

export function deleteService(id: string): Promise<void> {
  return api.delete(`/api/services/${id}`)
}
