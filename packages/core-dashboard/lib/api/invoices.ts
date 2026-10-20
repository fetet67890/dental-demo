import api from '../api-client'
import type { Invoice, Payment } from '@core/types'

export function getInvoices(params?: { patientId?: string; status?: string }): Promise<Invoice[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Invoice[]>(`/api/invoices${q ? '?' + q : ''}`)
}

export function getInvoice(id: string): Promise<Invoice> {
  return api.get<Invoice>(`/api/invoices/${id}`)
}

export function createInvoice(data: Omit<Invoice, 'id' | 'payments'>): Promise<Invoice> {
  return api.post<Invoice>('/api/invoices', data)
}

export function updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
  return api.put<Invoice>(`/api/invoices/${id}`, data)
}

export function deleteInvoice(id: string): Promise<void> {
  return api.delete(`/api/invoices/${id}`)
}

export function addPayment(
  invoiceId: string,
  data: Omit<Payment, 'id' | 'invoiceId'>
): Promise<Invoice> {
  return api.post<Invoice>(`/api/invoices/${invoiceId}/payments`, data)
}

// Opens the real, server-generated PDF directly in a new tab (the browser's
// own native PDF viewer) so staff see/print it immediately — no in-app
// preview, no forced silent download. The object URL is revoked on a delay
// long enough for the new tab to actually load it first.
export async function openInvoicePdf(id: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hypocrates_token') : null
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  const res = await fetch(`${base}/api/invoices/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
