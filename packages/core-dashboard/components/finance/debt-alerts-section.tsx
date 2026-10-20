"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@core/components/ui/button'
import { Card, CardContent } from '@core/components/ui/card'
import { Input } from '@core/components/ui/input'
import { Switch } from '@core/components/ui/switch'
import { StatusBadge } from '@core/components/ui/status-badge'
import { AlertTriangle, Send, Loader2, CalendarClock, Wallet, MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import { fmtDate } from '@core/lib/utils'
import { fmtLEK, fmtEUR } from '@core/lib/currency'
import {
  getDebtAlertSettings, updateDebtAlertSettings,
  getDueDebtAlerts, sendDebtAlerts,
  type DebtAlertSettings, type OverdueInvoice,
} from '@core/lib/api/debt-alerts'
import { getIntegrations } from '@core/lib/api/integrations'

export function DebtAlertsSection() {
  const t = useTranslations('admin-borxhet')
  const [settings, setSettings] = useState<DebtAlertSettings | null>(null)
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([])
  const [smtpConfigured, setSmtpConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, due, integrations] = await Promise.all([
        getDebtAlertSettings(), getDueDebtAlerts(), getIntegrations(),
      ])
      setSettings(s)
      setOverdueInvoices(due.invoices)
      setSmtpConfigured(
        ['smtp_host', 'smtp_user', 'smtp_pass'].every(
          (key) => integrations.find((i) => i.key === key)?.configured
        )
      )
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (enabled: boolean) => {
    if (!settings) return
    setSaving(true)
    try {
      const updated = await updateDebtAlertSettings({ enabled })
      setSettings(updated)
    } catch {
      toast.error('Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const handleIntervalChange = async (value: string) => {
    const n = parseInt(value, 10)
    if (!n || n < 1 || n > 90) return
    setSaving(true)
    try {
      const updated = await updateDebtAlertSettings({ intervalDays: n })
      setSettings(updated)
      await load()
    } catch {
      toast.error('Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const handleSendNow = async () => {
    setSending(true)
    try {
      const result = await sendDebtAlerts()
      if (result.skipped) {
        toast.info('Kujtesat e borxhit janë të çaktivizuara')
      } else {
        toast.success(`${result.sent} kujtesa u dërguan, ${result.failed} dështuan`)
      }
      await load()
    } catch {
      toast.error('Gabim gjatë dërgimit')
    } finally {
      setSending(false)
    }
  }

  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.remainingAmount, 0)

  return (
    <div className="space-y-6">

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 ibg-red rounded-xl">
                <AlertTriangle className="h-5 w-5 ic-red" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('alertCard.heading')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('alertCard.description')}
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.enabled ?? false}
              onCheckedChange={handleToggle}
              disabled={loading || saving}
            />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground shrink-0">{t('alertCard.intervalLabel')}</p>
            <Input
              type="number"
              min={1}
              max={90}
              defaultValue={settings?.intervalDays ?? 7}
              key={settings?.intervalDays}
              onBlur={(e) => handleIntervalChange(e.target.value)}
              className="w-24"
              disabled={loading || saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-foreground">{t('overdue.heading')}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t('overdue.summary', { count: overdueInvoices.length, lek: fmtLEK(totalOverdue), eur: fmtEUR(totalOverdue) })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Button
                onClick={handleSendNow}
                disabled={sending || loading || overdueInvoices.length === 0 || !smtpConfigured}
                className="gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('overdue.sendNow')}
              </Button>
              {!loading && !smtpConfigured && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MailWarning className="h-3.5 w-3.5 shrink-0" />
                  {t('overdue.smtpNotConfigured')}{' '}
                  <Link href="/admin/profili?section=konfigurimi&sub=integrimet" className="underline hover:text-foreground">
                    {t('overdue.configureHere')}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : overdueInvoices.length > 0 ? (
            <div className="space-y-2">
              {overdueInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3.5 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-card border border-border rounded-lg">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('overdue.idDue', { id: inv.id.slice(-6).toUpperCase(), date: fmtDate(inv.dueDate) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex flex-col items-end">
                      <span className="text-sm font-bold text-foreground">{fmtLEK(inv.remainingAmount)}</span>
                      <span className="text-xs text-muted-foreground">{fmtEUR(inv.remainingAmount)}</span>
                    </span>
                    <StatusBadge status={inv.status} type="invoice" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('overdue.empty')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
