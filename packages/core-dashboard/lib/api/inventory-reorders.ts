import api from '../api-client'

export interface ReorderRequest {
  id: string
  itemId: string
  itemName: string
  requestedQuantity: number
  status: 'ne_pritje' | 'porositur' | 'pranuar' | 'anuluar'
  requestedBy: string
  createdAt: string
  resolvedAt?: string
}

export function getReorderRequests(status?: string): Promise<ReorderRequest[]> {
  const q = status ? `?status=${status}` : ''
  return api.get<ReorderRequest[]>(`/api/inventory-reorders${q}`)
}

export function updateReorderRequestStatus(
  id: string,
  status: 'porositur' | 'pranuar' | 'anuluar'
): Promise<ReorderRequest> {
  return api.patch<ReorderRequest>(`/api/inventory-reorders/${id}/status`, { status })
}
