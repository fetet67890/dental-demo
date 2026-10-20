import api from '../api-client'

export type WebsiteInquiryStatus = 'e_re' | 'kontaktuar' | 'mbyllur'

export interface WebsiteInquiry {
  id: string
  name: string
  phone: string
  email?: string
  service?: string
  message?: string
  preferredDate?: string
  preferredTime?: string
  status: WebsiteInquiryStatus
  staffNote?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
}

export function getWebsiteInquiries(status?: WebsiteInquiryStatus): Promise<WebsiteInquiry[]> {
  return api.get<WebsiteInquiry[]>(`/api/website-inquiries${status ? `?status=${status}` : ''}`)
}

export function updateWebsiteInquiry(
  id: string,
  data: { status: WebsiteInquiryStatus; staffNote?: string }
): Promise<WebsiteInquiry> {
  return api.put<WebsiteInquiry>(`/api/website-inquiries/${id}`, data)
}
