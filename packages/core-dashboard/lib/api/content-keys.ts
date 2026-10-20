import api from '../api-client'

export interface SiteLocale {
  code: string
  label: string
  isDefault: boolean
}

export interface ContentKeyEntry {
  key: string
  type: 'text' | 'image'
  pageGroup: string
  values: Record<string, string>
}

export type GroupedContent = Record<string, ContentKeyEntry[]>

// Public endpoint (no auth needed — same one Hypocrates-Web itself calls),
// reused here just to list which locales exist; locale management itself
// isn't sensitive data.
export function getSiteLocales(): Promise<SiteLocale[]> {
  return api.get('/api/public/locales')
}

export function addSiteLocale(code: string, label: string): Promise<SiteLocale> {
  return api.post('/api/content-keys/locales', { code, label })
}

export function removeSiteLocale(code: string): Promise<{ removed: string }> {
  return api.delete(`/api/content-keys/locales/${code}`)
}

export function setDefaultSiteLocale(code: string): Promise<{ code: string }> {
  return api.put(`/api/content-keys/locales/${code}/default`, {})
}

export function getAllSiteContent(): Promise<GroupedContent> {
  return api.get('/api/content-keys')
}

export function upsertSiteContent(key: string, locale: string, value: string, pageGroup?: string): Promise<{ key: string; locale: string; value: string }> {
  return api.put(`/api/content-keys/${encodeURIComponent(key)}`, { locale, value, pageGroup })
}

export function translateSiteContent(key: string, fromLocale: string, toLocale: string): Promise<{ translation: string }> {
  return api.post(`/api/content-keys/${encodeURIComponent(key)}/translate`, { fromLocale, toLocale })
}
