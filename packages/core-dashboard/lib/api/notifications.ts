import api from '../api-client'
import type { NotificationLog } from '@core/types'

export function getNotifications(params?: { type?: string; status?: string }): Promise<NotificationLog[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<NotificationLog[]>(`/api/notifications${q ? '?' + q : ''}`)
}

export function sendNotification(data: {
  recipient: string
  message: string
}): Promise<NotificationLog> {
  return api.post<NotificationLog>('/api/notifications', { ...data, type: 'email' })
}
