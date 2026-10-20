import api from '../api-client'

export interface CashReconciliation {
  id: string
  date: string
  openingFloat: number
  openedBy: string
  openedAt: string
  closingFloatExpected?: number
  closingFloatActual?: number
  discrepancy?: number
  notes?: string
  closedBy?: string
  closedAt?: string
  status: 'hapur' | 'mbyllur'
}

export interface TodayCashStatus {
  date: string
  record: CashReconciliation | null
  expectedIfClosedNow?: number
  cashIn: number
  cashOut: number
}

export function getTodayCashStatus(): Promise<TodayCashStatus> {
  return api.get<TodayCashStatus>('/api/cash-reconciliation/today')
}

export function openCashDrawer(openingFloat: number): Promise<CashReconciliation> {
  return api.post<CashReconciliation>('/api/cash-reconciliation/open', { openingFloat })
}

export function closeCashDrawer(closingFloatActual: number, notes?: string): Promise<CashReconciliation> {
  return api.post<CashReconciliation>('/api/cash-reconciliation/close', { closingFloatActual, notes })
}

export function getCashReconciliationHistory(): Promise<CashReconciliation[]> {
  return api.get<CashReconciliation[]>('/api/cash-reconciliation')
}
