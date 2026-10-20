import api from '../api-client'
import type { FollowupTemplate } from '@core/types'

export function getFollowupTemplates(treatmentType?: string): Promise<FollowupTemplate[]> {
  const q = treatmentType ? `?treatmentType=${encodeURIComponent(treatmentType)}` : ''
  return api.get<FollowupTemplate[]>(`/api/followup-templates${q}`)
}

export function createFollowupTemplate(data: { treatmentType: string; label: string; daysAfter: number; sortOrder?: number; isActive?: boolean }): Promise<FollowupTemplate> {
  return api.post<FollowupTemplate>('/api/followup-templates', data)
}

export function updateFollowupTemplate(id: string, data: Partial<Omit<FollowupTemplate, 'id'>>): Promise<FollowupTemplate> {
  return api.put<FollowupTemplate>(`/api/followup-templates/${id}`, data)
}

export function deleteFollowupTemplate(id: string): Promise<void> {
  return api.delete(`/api/followup-templates/${id}`)
}
