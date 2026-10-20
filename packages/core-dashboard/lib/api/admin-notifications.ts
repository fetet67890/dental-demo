import api from '../api-client'
import type { AppNotification } from '@core/types'

export function getAdminNotifications(): Promise<AppNotification[]> {
  return api.get<AppNotification[]>('/api/admin-notifications')
}

export function markAllSeen(): Promise<void> {
  return api.post<void>('/api/admin-notifications/mark-seen', {})
}
