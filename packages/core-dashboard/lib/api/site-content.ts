import api from '../api-client'

export interface ContactInfo {
  address: string
  phone: string
  email: string
  hours: string
}

export interface AnnouncementBanner {
  message: string
  isActive: boolean
}

export function getContactInfo(): Promise<ContactInfo> {
  return api.get<ContactInfo>('/api/site-content/contact')
}

export function updateContactInfo(data: Partial<ContactInfo>): Promise<ContactInfo> {
  return api.put<ContactInfo>('/api/site-content/contact', data)
}

export function getAnnouncement(): Promise<AnnouncementBanner> {
  return api.get<AnnouncementBanner>('/api/site-content/announcement')
}

export function updateAnnouncement(data: Partial<AnnouncementBanner>): Promise<AnnouncementBanner> {
  return api.put<AnnouncementBanner>('/api/site-content/announcement', data)
}
