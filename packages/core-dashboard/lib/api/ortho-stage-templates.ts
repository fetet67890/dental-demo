import api from '../api-client'
import type { OrthoStageTemplate } from '@core/types'

export function getOrthoStageTemplates(): Promise<OrthoStageTemplate[]> {
  return api.get<OrthoStageTemplate[]>('/api/ortho-stage-templates')
}

export function createOrthoStageTemplate(data: { label: string; sortOrder?: number; isActive?: boolean }): Promise<OrthoStageTemplate> {
  return api.post<OrthoStageTemplate>('/api/ortho-stage-templates', data)
}

export function updateOrthoStageTemplate(id: string, data: Partial<Omit<OrthoStageTemplate, 'id'>>): Promise<OrthoStageTemplate> {
  return api.put<OrthoStageTemplate>(`/api/ortho-stage-templates/${id}`, data)
}

export function deleteOrthoStageTemplate(id: string): Promise<void> {
  return api.delete(`/api/ortho-stage-templates/${id}`)
}
