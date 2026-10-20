import api from '../api-client'

export interface DebtAlertSettings {
  intervalDays: number
  enabled: boolean
}

export interface OverdueInvoice {
  id: string
  patientId: string
  patientName: string
  patientEmail: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  dueDate: string
  status: 'papaguar' | 'pjeserisht'
}

export function getDebtAlertSettings(): Promise<DebtAlertSettings> {
  return api.get<DebtAlertSettings>('/api/debt-alerts/settings')
}

export function updateDebtAlertSettings(data: Partial<DebtAlertSettings>): Promise<DebtAlertSettings> {
  return api.put<DebtAlertSettings>('/api/debt-alerts/settings', data)
}

export function getDueDebtAlerts(): Promise<{ intervalDays: number; count: number; invoices: OverdueInvoice[] }> {
  return api.get('/api/debt-alerts/due')
}

export function sendDebtAlerts(): Promise<{ skipped: boolean; sent: number; failed: number; total?: number }> {
  return api.post('/api/debt-alerts/send', {})
}
