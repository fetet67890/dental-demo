import api from '../api-client'

export interface IntegrationCredentialStatus {
  key: string
  label: string
  group: string
  groupLabel: string
  sensitive: boolean
  options: { value: string; label: string }[] | null
  configured: boolean
  source: 'db' | 'env' | 'default' | null
  preview: string | null
  updatedAt: string | null
}

export function getIntegrations(): Promise<IntegrationCredentialStatus[]> {
  return api.get<IntegrationCredentialStatus[]>('/api/integrations')
}

export function setIntegrationCredential(key: string, value: string): Promise<{ key: string; configured: boolean; preview: string | null }> {
  return api.post<{ key: string; configured: boolean; preview: string | null }>(`/api/integrations/${key}`, { value })
}

export function deleteIntegrationCredential(key: string): Promise<{ key: string; configured: boolean; preview: string | null }> {
  return api.delete<{ key: string; configured: boolean; preview: string | null }>(`/api/integrations/${key}`)
}

export function testIntegrationGroup(group: string): Promise<{ ok: boolean; message: string }> {
  return api.post<{ ok: boolean; message: string }>(`/api/integrations/test/${group}`, {})
}
