import { demoRequest, MockHttpError } from './demo/mock-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
// Front-end-only sales demo build (no api/mysql containers at all — see
// docker-compose.yml's `demo` profile) — every call below is intercepted by
// lib/demo/mock-client.ts instead of hitting the network. Build-time only,
// like NEXT_PUBLIC_ENABLE_DEMO_LOGIN, so it's baked into the bundle rather
// than toggleable at runtime.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hypocrates_token')
}

export function setToken(token: string) {
  localStorage.setItem('hypocrates_token', token)
}

export function clearToken() {
  localStorage.removeItem('hypocrates_token')
  localStorage.removeItem('hypocrates_user')
}

// Shared by both the real fetch path and the demo interceptor below — a
// session-ending 401 means the same thing either way: drop the stale token
// and bounce to login, except inside the patient portal, which has its own
// separate auth and must never be hijacked by this staff-side redirect.
function handleUnauthorized() {
  if (typeof window === 'undefined') return
  clearToken()
  const path = window.location.pathname
  if (!path.startsWith('/hyrje') && !path.startsWith('/portal')) {
    window.location.href = '/hyrje'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  // Don't set Content-Type for FormData — the browser must set it with the multipart boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  if (DEMO_MODE) {
    try {
      return await demoRequest<T>(path, { ...options, headers })
    } catch (err) {
      const status = err instanceof MockHttpError ? err.status : 500
      const message = err instanceof Error ? err.message : 'Gabim'
      if (status === 401) handleUnauthorized()
      throw new ApiError(status, message)
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body.error || body.message || message
    } catch {}

    if (res.status === 401) handleUnauthorized()

    throw new ApiError(res.status, message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string) => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // File upload (multipart/form-data — no Content-Type header so browser sets boundary)
  upload: <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return request<T>(path, { method: 'POST', body: formData, headers })
  },
}

export { ApiError }
export default api
