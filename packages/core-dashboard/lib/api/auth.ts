import api, { setToken, clearToken } from '../api-client'
import type { User } from '@core/types'

export interface LoginResponse {
  token: string
  user: User
}

export interface MfaRequiredResponse {
  mfaRequired: true
  preAuthToken: string
}

export async function login(email: string, password: string): Promise<LoginResponse | MfaRequiredResponse> {
  const data = await api.post<LoginResponse | MfaRequiredResponse>('/api/auth/login', { email, password })
  if ('mfaRequired' in data) return data
  setToken(data.token)
  return data
}

export async function verifyMfaLogin(preAuthToken: string, code: string): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/api/auth/mfa/verify-login', { preAuthToken, code })
  setToken(data.token)
  return data
}

// Staff/admin equivalent of the patient portal's /activate flow — see
// Hypocrates-Api's auth.controller.js getInvite/acceptInvite. First real
// user is Fleet's provisioning engine bootstrapping a new clinic's first
// admin, via the Dashboard's own /aktivizo page.
export async function getInvite(token: string): Promise<{ email: string; name: string }> {
  return api.get(`/api/auth/invite/${encodeURIComponent(token)}`)
}

export async function acceptInvite(token: string, password: string): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/api/auth/accept-invite', { token, password })
  setToken(data.token)
  return data
}

// Email-code MFA (not TOTP/QR — see auth.controller.js). setupMfa/
// requestMfaDisable both just trigger "email me a fresh code"; the masked
// address is returned so the UI can show "we sent a code to k***@..." as
// confirmation of where to look.
export function setupMfa(): Promise<{ sent: boolean; maskedEmail: string }> {
  return api.post('/api/auth/mfa/setup', {})
}

export function verifyMfaSetup(code: string): Promise<{ enabled: boolean }> {
  return api.post('/api/auth/mfa/verify-setup', { code })
}

export function requestMfaDisable(): Promise<{ sent: boolean; maskedEmail: string }> {
  return api.post('/api/auth/mfa/disable/request', {})
}

export function disableMfa(code: string): Promise<{ enabled: boolean }> {
  return api.post('/api/auth/mfa/disable', { code })
}

export async function getMe(): Promise<{ user: User }> {
  return api.get<{ user: User }>('/api/auth/me')
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/api/auth/password', { currentPassword, newPassword })
}

export async function updateProfile(data: { name?: string; email?: string }): Promise<{ user: User }> {
  return api.put<{ user: User }>('/api/auth/profile', data)
}

export async function uploadAvatar(file: File): Promise<{ user: User }> {
  const fd = new FormData()
  fd.append('file', file)
  return api.upload<{ user: User }>('/api/auth/avatar', fd)
}

export async function removeAvatar(): Promise<{ user: User }> {
  return api.delete<{ user: User }>('/api/auth/avatar')
}

export function logout() {
  clearToken()
}
