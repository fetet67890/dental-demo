import api from '../api-client'

export interface PageMeta {
  pageKey: string
  title: string
  description: string
  updatedAt: string | null
}

export function getPageMetaList(): Promise<PageMeta[]> {
  return api.get<PageMeta[]>('/api/page-meta')
}

export function upsertPageMeta(
  pageKey: string,
  data: { title?: string; description?: string }
): Promise<PageMeta> {
  return api.put<PageMeta>(`/api/page-meta/${pageKey}`, data)
}

export function deletePageMeta(pageKey: string): Promise<void> {
  return api.delete(`/api/page-meta/${pageKey}`)
}
