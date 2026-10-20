import api from '../api-client'

export interface Installment {
  id: string
  invoiceId: string
  installmentNumber: number
  amount: number
  dueDate: string
  status: 'papaguar' | 'paguar'
  paidAt?: string
}

export function getInstallments(invoiceId: string): Promise<Installment[]> {
  return api.get<Installment[]>(`/api/installments?invoiceId=${encodeURIComponent(invoiceId)}`)
}

export function createInstallmentPlan(data: {
  invoiceId: string; count: number; firstDueDate: string; intervalDays?: number
}): Promise<Installment[]> {
  return api.post<Installment[]>('/api/installments/plan', data)
}

export function payInstallment(id: string, method: 'cash' | 'karte' | 'transfer'): Promise<Installment> {
  return api.patch<Installment>(`/api/installments/${id}/pay`, { method })
}

export function deleteInstallmentPlan(invoiceId: string): Promise<void> {
  return api.delete(`/api/installments/plan?invoiceId=${encodeURIComponent(invoiceId)}`)
}
