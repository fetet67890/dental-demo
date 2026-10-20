import api from '../api-client'
import type { AuditLog } from '@core/types'

export interface AuditLogQuery {
  userId?: string
  role?: string
  search?: string
  limit?: number
  offset?: number
}

export function getAuditLogs(params?: AuditLogQuery): Promise<AuditLog[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<AuditLog[]>(`/api/audit${q ? '?' + q : ''}`)
}

export function getAuditLogsCount(params?: Omit<AuditLogQuery, 'limit' | 'offset'>): Promise<{ total: number }> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<{ total: number }>(`/api/audit/count${q ? '?' + q : ''}`)
}
