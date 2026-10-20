import api from '../api-client'
import type { Room } from '@core/types'

export function getRooms(params?: { isActive?: string }): Promise<Room[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Room[]>(`/api/rooms${q ? '?' + q : ''}`)
}

export function createRoom(data: Omit<Room, 'id' | 'createdAt'>): Promise<Room> {
  return api.post<Room>('/api/rooms', data)
}

export function updateRoom(id: string, data: Partial<Room>): Promise<Room> {
  return api.put<Room>(`/api/rooms/${id}`, data)
}

export function deleteRoom(id: string): Promise<void> {
  return api.delete(`/api/rooms/${id}`)
}
