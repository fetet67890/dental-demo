"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Topbar } from '@core/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Textarea } from '@core/components/ui/textarea'
import { Badge } from '@core/components/ui/badge'
import { Field, FieldLabel } from '@core/components/ui/field'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import {
  getWebsiteInquiries, updateWebsiteInquiry,
  type WebsiteInquiry, type WebsiteInquiryStatus,
} from '@core/lib/api/website-inquiries'

export default function WebsiteInquiriesPage() {
  const t = useTranslations('recepsion-kerkesa-faqja')

  const STATUS_LABEL: Record<WebsiteInquiryStatus, string> = {
    e_re: t('status.new'),
    kontaktuar: t('status.contacted'),
    mbyllur: t('status.closed'),
  }

  const TABS: { value: WebsiteInquiryStatus | 'all'; label: string }[] = [
    { value: 'e_re', label: t('tabs.new') },
    { value: 'kontaktuar', label: t('tabs.contacted') },
    { value: 'mbyllur', label: t('tabs.closed') },
    { value: 'all', label: t('tabs.all') },
  ]

  const [tab, setTab] = useState<WebsiteInquiryStatus | 'all'>('e_re')
  const [inquiries, setInquiries] = useState<WebsiteInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<{ inquiry: WebsiteInquiry; nextStatus: WebsiteInquiryStatus } | null>(null)
  const [staffNote, setStaffNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    getWebsiteInquiries(tab === 'all' ? undefined : tab)
      .then(setInquiries)
      .catch(() => toast.error('Gabim gjatë ngarkimit të kërkesave'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab])

  const openAction = (inquiry: WebsiteInquiry, nextStatus: WebsiteInquiryStatus) => {
    setActing({ inquiry, nextStatus })
    setStaffNote(inquiry.staffNote || '')
  }

  const handleConfirm = async () => {
    if (!acting) return
    try {
      setSubmitting(true)
      await updateWebsiteInquiry(acting.inquiry.id, { status: acting.nextStatus, staffNote: staffNote || undefined })
      toast.success('U përditësua me sukses')
      setActing(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë përditësimit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center gap-2">
            {TABS.map(tabDef => (
              <Button
                key={tabDef.value}
                size="sm"
                variant={tab === tabDef.value ? 'default' : 'outline'}
                onClick={() => setTab(tabDef.value)}
              >
                {tabDef.label}
              </Button>
            ))}
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : inquiries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noInquiries')}</p>
            ) : (
              <ul className="space-y-3">
                {inquiries.map(inq => (
                  <li key={inq.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                    <div className="text-sm min-w-0">
                      <p className="font-medium">{inq.name} · {inq.phone}</p>
                      <p className="text-muted-foreground">
                        {inq.service && <>{inq.service} · </>}
                        {inq.preferredDate || t('noSpecificDate')} {inq.preferredTime || ''}
                        {inq.email && <> · {inq.email}</>}
                      </p>
                      {inq.message && <p className="text-muted-foreground mt-1">{inq.message}</p>}
                      {inq.staffNote && <p className="text-xs text-muted-foreground mt-1 italic">{t('note', { note: inq.staffNote })}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{STATUS_LABEL[inq.status]}</Badge>
                      {inq.status !== 'kontaktuar' && (
                        <Button size="sm" onClick={() => openAction(inq, 'kontaktuar')}>{t('status.contacted')}</Button>
                      )}
                      {inq.status !== 'mbyllur' && (
                        <Button size="sm" variant="outline" onClick={() => openAction(inq, 'mbyllur')}>{t('close')}</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!acting} onOpenChange={(open) => !open && setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {acting?.nextStatus === 'kontaktuar' ? t('markContacted') : t('closeInquiry')} — {acting?.inquiry.name}
            </DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="staffNote">{t('noteLabel')}</FieldLabel>
            <Textarea id="staffNote" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} rows={3} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActing(null)}>{t('cancel')}</Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? t('saving') : t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
