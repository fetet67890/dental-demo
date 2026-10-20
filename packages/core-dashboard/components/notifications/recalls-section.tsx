"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@core/components/ui/button'
import { Card, CardContent } from '@core/components/ui/card'
import { Input } from '@core/components/ui/input'
import { Switch } from '@core/components/ui/switch'
import { BellRing, Mail, Send, Loader2, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { fmtDate } from '@core/lib/utils'
import {
  getRecallSettings, updateRecallSettings,
  getDueRecalls, sendRecalls,
  type RecallSettings, type DuePatient,
} from '@core/lib/api/recalls'

export function RecallsSection() {
  const t = useTranslations('admin-rikujtesat')
  const [settings, setSettings] = useState<RecallSettings | null>(null)
  const [duePatients, setDuePatients] = useState<DuePatient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, due] = await Promise.all([getRecallSettings(), getDueRecalls()])
      setSettings(s)
      setDuePatients(due.patients)
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
      const updated = await updateRecallSettings({ enabled })
      setSettings(updated)
    } catch {
      toast.error('Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const handleIntervalChange = async (value: string) => {
    const n = parseInt(value, 10)
    if (!n || n < 1 || n > 36) return
    setSaving(true)
    try {
      const updated = await updateRecallSettings({ intervalMonths: n })
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
      const result = await sendRecalls()
      if (result.skipped) {
        toast.info('Kujtesat janë të çaktivizuara')
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

  return (
    <div className="space-y-6">

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent/10 rounded-xl">
                <BellRing className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('automaticRecalls')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('automaticRecallsHint')}
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
            <p className="text-sm text-muted-foreground shrink-0">{t('intervalMonths')}</p>
            <Input
              type="number"
              min={1}
              max={36}
              defaultValue={settings?.intervalMonths ?? 6}
              key={settings?.intervalMonths}
              onBlur={(e) => handleIntervalChange(e.target.value)}
              className="w-24"
              disabled={loading || saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">{t('patientsAwaiting')}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t('patientCount', { count: duePatients.length })}</p>
            </div>
            <Button onClick={handleSendNow} disabled={sending || loading || duePatients.length === 0} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('sendNow')}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : duePatients.length > 0 ? (
            <div className="space-y-2">
              {duePatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3.5 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-card border border-border rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.lastVisit ? t('lastVisit', { date: fmtDate(p.lastVisit) }) : t('noVisitRecorded')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <BellRing className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('emptyState')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
