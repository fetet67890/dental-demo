import api from '../api-client'
import type { DailyTransaction } from '@core/types'

export interface TransactionSummary {
  date:    string
  hyrese:  number
  dalje:   number
  balance: number
}

export function getTransactions(params?: {
  type?: string
  method?: string
  date?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<DailyTransaction[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<DailyTransaction[]>(`/api/transactions${q ? '?' + q : ''}`)
}

export function getTransactionSummary(date?: string): Promise<TransactionSummary> {
  return api.get<TransactionSummary>(`/api/transactions/summary${date ? '?date=' + date : ''}`)
}

export function createTransaction(
  data: Omit<DailyTransaction, 'id' | 'createdAt' | 'createdBy'>
): Promise<DailyTransaction> {
  return api.post<DailyTransaction>('/api/transactions', data)
}
