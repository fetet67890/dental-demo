import api from '../api-client'

export type ExpiryStatus = 'ok' | 'expiring_soon' | 'expired' | null

export interface InventoryItem {
  id: string
  name: string
  category?: string
  quantity: number
  unit: string
  lowStockThreshold: number
  lowStock: boolean
  expiryDate?: string
  lotNumber?: string
  expiryStatus: ExpiryStatus
  createdAt: string
  updatedAt: string
  // Only ever set for specialties that have Dermatology's own retail-pos
  // migration applied — see @hypocrates/core-api's inventory.controller.js
  // buildItem() and apps/dermatology/api/src/specialty/retail-sales.
  // controller.js for where this actually gets read/written.
  sellPrice?: number
}

export function getInventory(params?: { lowStock?: boolean; expiring?: boolean; search?: string }): Promise<InventoryItem[]> {
  const q = new URLSearchParams()
  if (params?.lowStock) q.set('lowStock', 'true')
  if (params?.expiring) q.set('expiring', 'true')
  if (params?.search) q.set('search', params.search)
  const qs = q.toString()
  return api.get<InventoryItem[]>(`/api/inventory${qs ? '?' + qs : ''}`)
}

export function createInventoryItem(data: {
  name: string; category?: string; quantity?: number; unit?: string; lowStockThreshold?: number
  expiryDate?: string; lotNumber?: string
}): Promise<InventoryItem> {
  return api.post<InventoryItem>('/api/inventory', data)
}

export function updateInventoryItem(id: string, data: Partial<{
  name: string; category: string; unit: string; lowStockThreshold: number
  expiryDate: string; lotNumber: string
}>): Promise<InventoryItem> {
  return api.put<InventoryItem>(`/api/inventory/${id}`, data)
}

export function adjustInventoryItem(id: string, delta: number): Promise<InventoryItem> {
  return api.patch<InventoryItem>(`/api/inventory/${id}/adjust`, { delta })
}

export function deleteInventoryItem(id: string): Promise<void> {
  return api.delete(`/api/inventory/${id}`)
}
