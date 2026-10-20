import api from '../api-client'

export interface FaqEntry {
  id: string
  question: string
  answer: string
  category: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function getFaqEntries(params?: { category?: string; isActive?: string }): Promise<FaqEntry[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<FaqEntry[]>(`/api/faq${q ? '?' + q : ''}`)
}

export function createFaqEntry(data: { question: string; answer: string; category?: string; isActive?: boolean }): Promise<FaqEntry> {
  return api.post<FaqEntry>('/api/faq', data)
}

export function updateFaqEntry(id: string, data: Partial<{ question: string; answer: string; category: string; isActive: boolean }>): Promise<FaqEntry> {
  return api.put<FaqEntry>(`/api/faq/${id}`, data)
}

export function deleteFaqEntry(id: string): Promise<void> {
  return api.delete(`/api/faq/${id}`)
}
