import type { ClinicDocument } from '@core/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
// This whole module predates lib/api-client.ts's shared request()/demo mock
// and hand-rolls its own fetch() calls (needed for the FormData upload and
// the raw file-URL open below) — so unlike everything routed through `api`,
// none of it was covered by lib/demo/mock-client.ts. Each function below
// gets its own explicit demo-mode branch instead.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const demoDelay = () => new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 300))

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hypocrates_token')
}

export async function getClinicDocuments(params?: { category?: string }): Promise<ClinicDocument[]> {
  if (DEMO_MODE) { await demoDelay(); return [] }
  const q = params?.category ? `?category=${params.category}` : ''
  const token = getToken()
  return fetch(`${API_BASE}/api/clinic-documents${q}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(r => r.json())
}

export async function uploadClinicDocument(formData: FormData): Promise<ClinicDocument> {
  if (DEMO_MODE) {
    await demoDelay()
    const file = formData.get('file')
    const name = file instanceof File ? file.name : (formData.get('name') as string) || 'Dokument'
    return {
      id: `demo-doc-${Math.random().toString(36).slice(2, 10)}`,
      name,
      description: (formData.get('description') as string) || '',
      fileType: name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
      fileSize: file instanceof File ? file.size : 0,
      category: (formData.get('category') as ClinicDocument['category']) || 'personal',
      passwordProtected: !!formData.get('password'),
      uploadedBy: 'Demo',
      uploadedById: 'demo-u-admin',
      uploadedAt: new Date().toISOString(),
    } as ClinicDocument
  }
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/clinic-documents/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body as ClinicDocument
}

export async function updateClinicDocument(
  id: string,
  data: { name?: string; description?: string; password?: string; removePassword?: boolean }
): Promise<ClinicDocument> {
  if (DEMO_MODE) {
    await demoDelay()
    return {
      id, name: data.name || 'Dokument', description: data.description || '',
      fileType: 'pdf', fileSize: 0, category: 'personal', passwordProtected: !!data.password,
      uploadedBy: 'Demo', uploadedById: 'demo-u-admin', uploadedAt: new Date().toISOString(),
    } as ClinicDocument
  }
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/clinic-documents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body as ClinicDocument
}

export async function deleteClinicDocument(id: string): Promise<void> {
  if (DEMO_MODE) { await demoDelay(); return }
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/clinic-documents/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
}

export async function openClinicDocument(id: string, password?: string): Promise<string> {
  if (DEMO_MODE) throw new Error('Hapja e dokumenteve nuk është e disponueshme në demo')
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (password) headers['X-Doc-Password'] = password

  const res = await fetch(`${API_BASE}/api/clinic-documents/${id}/file`, { headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body.url as string
}
