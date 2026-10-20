import api from '../api-client'

export interface MailboxSettings {
  enabled: boolean
  webmailUrl: string | null
  lastSyncedAt: string | null
  lastSyncError: string | null
  // Whether Integrimet → Email (SMTP) has enough set (imap_host +
  // smtp_user + smtp_pass) to even turn `enabled` on.
  imapConfigured: boolean
}

export function getMailboxSettings(): Promise<MailboxSettings> {
  return api.get<MailboxSettings>('/api/clinic-mailbox/settings')
}

export function updateMailboxSettings(data: { enabled?: boolean; webmailUrl?: string }): Promise<MailboxSettings> {
  return api.put<MailboxSettings>('/api/clinic-mailbox/settings', data)
}

export function sendTestEmail(): Promise<{ message: string }> {
  return api.post('/api/clinic-mailbox/test', {})
}

export interface SyncedEmail {
  id: string
  fromAddress: string
  fromName: string | null
  subject: string | null
  snippet: string | null
  receivedAt: string
  isRead: boolean
  repliedAt: string | null
}

// Hours, not a named preset — the UI offers a few common choices (24h, 3d,
// 7d, 30d) but the API itself just takes a number, capped server-side at
// the same 30-day retention window clinic_synced_emails is purged to.
export function getEmails(hours: number): Promise<SyncedEmail[]> {
  return api.get<SyncedEmail[]>(`/api/clinic-mailbox/emails?hours=${hours}`)
}

export interface EmailDetail {
  id: string
  fromAddress: string
  fromName: string | null
  subject: string | null
  receivedAt: string
  body: string
}

// Fetches the full body live over IMAP (never stored) — expect this one to
// be visibly slower than everything else here, it's a real round-trip to
// an outside mail server, not a local DB read.
export function getEmail(id: string): Promise<EmailDetail> {
  return api.get<EmailDetail>(`/api/clinic-mailbox/emails/${id}`)
}

export function replyToEmail(id: string, body: string): Promise<{ message: string }> {
  return api.post(`/api/clinic-mailbox/emails/${id}/reply`, { body })
}
