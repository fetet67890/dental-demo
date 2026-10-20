"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@core/components/ui/button'
import { Card, CardContent } from '@core/components/ui/card'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { StatusBadge } from '@core/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@core/components/ui/table'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Send, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@core/lib/toast-error'
import { format } from 'date-fns'
import { sq } from 'date-fns/locale'
import { getNotifications, sendNotification } from '@core/lib/api/notifications'
import type { NotificationLog } from '@core/types'

const EMPTY = { recipient: '', message: '' }

export function ManualNotificationSection() {
  const t = useTranslations('admin-njoftimet')
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setLogs(await getNotifications())
    } catch {
      toast.error('Gabim gjatë ngarkimit të historikut')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSend = async () => {
    if (!form.recipient.trim() || !form.message.trim()) {
      toast.error('Plotësoni marrësin dhe mesazhin')
      return
    }
    setSending(true)
    try {
      const result = await sendNotification({
        recipient: form.recipient.trim(),
        message: form.message.trim(),
      })
      if (result.status === 'deshtuar') {
        toast.error('Dërgimi dështoi — kontrolloni konfigurimin e SMTP')
      } else {
        toast.success('Njoftimi u dërgua me sukses')
      }
      setForm(EMPTY)
      await load()
    } catch (err) {
      toastError(err, 'Gabim gjatë dërgimit të njoftimit')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/10 rounded-xl">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t('newNotification.heading')}</p>
              <p className="text-sm text-muted-foreground">{t('newNotification.description')}</p>
            </div>
          </div>

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>{t('newNotification.recipientLabel')}</FieldLabel>
              <Input
                value={form.recipient}
                onChange={(e) => set('recipient', e.target.value)}
                placeholder={t('newNotification.recipientPlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel>{t('newNotification.messageLabel')}</FieldLabel>
              <Textarea
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder={t('newNotification.messagePlaceholder')}
                className="resize-none h-24"
              />
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('newNotification.send')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <p className="font-semibold text-foreground">{t('history.heading')}</p>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('history.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('history.table.date')}</TableHead>
                    <TableHead>{t('history.table.type')}</TableHead>
                    <TableHead>{t('history.table.recipient')}</TableHead>
                    <TableHead>{t('history.table.message')}</TableHead>
                    <TableHead>{t('history.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), 'd MMM yyyy, HH:mm', { locale: sq })}
                      </TableCell>
                      <TableCell className="text-sm uppercase">{log.type}</TableCell>
                      <TableCell className="text-sm">{log.recipient}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{log.message}</TableCell>
                      <TableCell><StatusBadge status={log.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
