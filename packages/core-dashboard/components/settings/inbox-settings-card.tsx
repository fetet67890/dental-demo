"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Switch } from "@core/components/ui/switch"
import { Mail, Send, Loader2 } from "lucide-react"
import {
  getMailboxSettings, updateMailboxSettings, sendTestEmail, type MailboxSettings,
} from "@core/lib/api/clinic-mailbox"

// Sits in Integrimet (Konfigurimi → Integrimet), right after the Email
// (SMTP) credential group above it — imap_host/imap_port live there as
// plain CREDENTIAL_DEFS entries (see integrations.js), reusing
// smtp_user/smtp_pass as the IMAP login. This card only holds what isn't a
// credential: the on/off switch and the webmail deep-link.
export function InboxSettingsCard() {
  const t = useTranslations('integrimet-section')
  const [settings, setSettings] = useState<MailboxSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [webmailUrl, setWebmailUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getMailboxSettings()
      .then((s) => { setSettings(s); setWebmailUrl(s.webmailUrl || '') })
      .catch(() => toast.error(t('inbox.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const handleToggle = async (enabled: boolean) => {
    setToggling(true)
    try {
      const updated = await updateMailboxSettings({ enabled })
      setSettings(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('inbox.toggleError'))
    } finally {
      setToggling(false)
    }
  }

  const handleSaveUrl = async () => {
    setSavingUrl(true)
    try {
      const updated = await updateMailboxSettings({ webmailUrl })
      setSettings(updated)
      toast.success(t('save'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('inbox.toggleError'))
    } finally {
      setSavingUrl(false)
    }
  }

  const handleSendTest = async () => {
    setSendingTest(true)
    try {
      const res = await sendTestEmail()
      toast.success(res.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('inbox.testError'))
    } finally {
      setSendingTest(false)
    }
  }

  if (loading || !settings) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          {t('inbox.title')}
        </CardTitle>
        <div className="flex items-center gap-2">
          {toggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggle}
            disabled={toggling || !settings.imapConfigured}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('inbox.description')}</p>
        {!settings.imapConfigured && (
          <p className="text-xs text-amber-600">{t('inbox.needsImapHost')}</p>
        )}
        {settings.lastSyncError && (
          <p className="text-xs text-destructive">{settings.lastSyncError}</p>
        )}
        {settings.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            {t('inbox.lastSynced')}: {new Date(settings.lastSyncedAt).toLocaleString()}
          </p>
        )}
        <div className="space-y-1.5">
          <Label>{t('inbox.webmailUrl')}</Label>
          <div className="flex gap-2">
            <Input
              value={webmailUrl}
              onChange={(e) => setWebmailUrl(e.target.value)}
              placeholder="https://mail.google.com/mail/u/0/#inbox"
            />
            <Button size="sm" onClick={handleSaveUrl} disabled={savingUrl}>
              {savingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
            </Button>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleSendTest} disabled={sendingTest || !settings.imapConfigured}>
          {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('inbox.sendTest')}
        </Button>
      </CardContent>
    </Card>
  )
}
