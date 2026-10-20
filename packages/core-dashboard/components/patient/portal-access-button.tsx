"use client"

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@core/components/ui/button'
import { Badge } from '@core/components/ui/badge'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@core/components/ui/dialog'
import { Input } from '@core/components/ui/input'
import { Field, FieldLabel } from '@core/components/ui/field'
import { KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  getPortalStatus, enablePortalAccess, resendPortalInvite, revokePortalAccess,
  type PortalAccountStatus,
} from '@core/lib/api/patients'

export function PortalAccessButton({ patientId, patientEmail }: { patientId: string; patientEmail?: string }) {
  const t = useTranslations('portal-access-button')
  const STATUS_LABEL: Record<PortalAccountStatus['status'], string> = {
    ftuar: t('status.ftuar'),
    aktiv: t('status.aktiv'),
    'çaktivizuar': t('status.caktivizuar'),
  }
  const [account, setAccount] = useState<PortalAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [emailPromptOpen, setEmailPromptOpen] = useState(false)
  const [email, setEmail] = useState(patientEmail || '')

  const load = () => {
    getPortalStatus(patientId).then(res => setAccount(res.account)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [patientId])

  const showInviteResult = (result: { emailSent: boolean; inviteUrl?: string }) => {
    if (result.inviteUrl) {
      navigator.clipboard?.writeText(result.inviteUrl).catch(() => {})
      toast.success('Ftesa u krijua. Lidhja u kopjua (mënyra zhvillimi, pa SMTP).', {
        description: result.inviteUrl,
        duration: 15000,
      })
    } else if (result.emailSent) {
      toast.success('Ftesa u dërgua me email.')
    } else {
      toast.error('Llogaria u krijua, por dërgimi i email-it dështoi.')
    }
  }

  const handleEnable = async () => {
    if (!patientEmail && !email) {
      setEmailPromptOpen(true)
      return
    }
    try {
      setSubmitting(true)
      const result = await enablePortalAccess(patientId, patientEmail ? undefined : email)
      showInviteResult(result)
      setEmailPromptOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë aktivizimit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    try {
      setSubmitting(true)
      const result = await resendPortalInvite(patientId)
      showInviteResult(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ridërgimit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    try {
      setSubmitting(true)
      await revokePortalAccess(patientId)
      toast.success('Qasja në portal u çaktivizua')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë çaktivizimit')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <>
      <div className="flex items-center gap-2">
        {account && <Badge variant={account.status === 'aktiv' ? 'default' : 'secondary'}>{STATUS_LABEL[account.status]}</Badge>}
        {!account && (
          <Button variant="outline" size="sm" onClick={handleEnable} disabled={submitting}>
            <KeyRound className="h-4 w-4 mr-2" />
            {submitting ? t('activating') : t('activate')}
          </Button>
        )}
        {account && account.status === 'ftuar' && (
          <Button variant="outline" size="sm" onClick={handleResend} disabled={submitting}>
            {t('resendInvite')}
          </Button>
        )}
        {account && account.status === 'aktiv' && (
          <Button variant="outline" size="sm" onClick={handleRevoke} disabled={submitting} className="text-destructive">
            {t('deactivate')}
          </Button>
        )}
        {account && account.status === 'çaktivizuar' && (
          <Button variant="outline" size="sm" onClick={handleEnable} disabled={submitting}>
            {t('reactivate')}
          </Button>
        )}
      </div>

      <Dialog open={emailPromptOpen} onOpenChange={setEmailPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('emailDialog.title')}</DialogTitle>
            <DialogDescription>{t('emailDialog.description')}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="portalEmail">{t('emailDialog.emailLabel')}</FieldLabel>
            <Input id="portalEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailPromptOpen(false)}>{t('emailDialog.cancel')}</Button>
            <Button onClick={handleEnable} disabled={submitting || !email}>
              {submitting ? t('emailDialog.sending') : t('emailDialog.sendInvite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
