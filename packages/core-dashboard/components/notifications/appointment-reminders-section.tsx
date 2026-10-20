"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@core/components/ui/button'
import { Card, CardContent } from '@core/components/ui/card'
import { Input } from '@core/components/ui/input'
import { Switch } from '@core/components/ui/switch'
import { AlarmClock, Mail, Send, Loader2, Clock3 } from 'lucide-react'
import { toast } from 'sonner'
import { fmtDate } from '@core/lib/utils'
import {
  getAppointmentReminderSettings, updateAppointmentReminderSettings,
  getDueAppointmentReminders, sendAppointmentReminders,
  type AppointmentReminderSettings, type UpcomingReminderAppointment,
} from '@core/lib/api/appointment-reminders'

// Same shape as recalls-section.tsx on purpose — same underlying pattern
// (settings + a due-now list + a manual "send now", backed by a shared
// sweep function the hourly cron in server.js also calls).
export function AppointmentRemindersSection() {
  const t = useTranslations('admin-rikujtesat')
  const [settings, setSettings] = useState<AppointmentReminderSettings | null>(null)
  const [due, setDue] = useState<UpcomingReminderAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, d] = await Promise.all([getAppointmentReminderSettings(), getDueAppointmentReminders()])
      setSettings(s)
      setDue(d.appointments)
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
      const updated = await updateAppointmentReminderSettings({ enabled })
      setSettings(updated)
    } catch {
      toast.error('Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const handleLeadHoursChange = async (value: string) => {
    const n = parseInt(value, 10)
    if (!n || n < 1 || n > 72) return
    setSaving(true)
    try {
      const updated = await updateAppointmentReminderSettings({ leadHours: n })
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
      const result = await sendAppointmentReminders()
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
                <AlarmClock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('appointmentReminders.automatic')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('appointmentReminders.automaticHint')}
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
            <Clock3 className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground shrink-0">{t('appointmentReminders.leadHours')}</p>
            <Input
              type="number"
              min={1}
              max={72}
              defaultValue={settings?.leadHours ?? 24}
              key={settings?.leadHours}
              onBlur={(e) => handleLeadHoursChange(e.target.value)}
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
              <p className="font-semibold text-foreground">{t('appointmentReminders.due')}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t('appointmentReminders.dueCount', { count: due.length })}</p>
            </div>
            <Button onClick={handleSendNow} disabled={sending || loading || due.length === 0} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('sendNow')}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : due.length > 0 ? (
            <div className="space-y-2">
              {due.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3.5 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-card border border-border rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.patientName}</p>
                      <p className="text-xs text-muted-foreground">{a.patientEmail}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(a.date)}{a.time ? ` · ${a.time}` : ''}{a.doctorName ? ` · ${a.doctorName}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <AlarmClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('appointmentReminders.emptyState')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
