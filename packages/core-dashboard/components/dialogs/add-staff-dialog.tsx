"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { useData } from '@core/context/data-context'
import { toast } from 'sonner'
import { toastError } from '@core/lib/toast-error'
import { cn } from '@core/lib/utils'
import { Eye, EyeOff } from 'lucide-react'
import { UserRole } from '@core/types'

const EMPTY = { name: '', email: '', phone: '', role: '' as UserRole | '', specialization: '', password: '', confirmPassword: '' }

interface Props { open: boolean; onClose: () => void }

export function AddStaffDialog({ open, onClose }: Props) {
  const t = useTranslations('add-staff-dialog')
  const { addStaff } = useData()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const handleClose = () => { setForm(EMPTY); setErrors({}); setShowPw(false); setShowConfirm(false); onClose() }

  const handleSubmit = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errors.nameRequired')
    if (!form.phone.trim()) e.phone = t('errors.phoneRequired')
    if (form.password && form.password.length < 6) e.password = t('errors.passwordMinLength')
    if (form.password && form.password !== form.confirmPassword) e.confirmPassword = t('errors.passwordMismatch')
    if (Object.keys(e).length) { setErrors(e); toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.'); return }

    setLoading(true)
    try {
      await addStaff({
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        role: form.role as UserRole, specialization: form.specialization.trim(),
        status: 'aktiv', password: form.password,
      })
      toast.success('Anëtari u shtua me sukses')
      handleClose()
    } catch (err) {
      toastError(err, 'Gabim gjatë shtimit të anëtarit')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('title')}</DialogTitle></DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel>{t('fullName')}</FieldLabel>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              className={cn(errors.name && 'border-destructive focus-visible:ring-destructive/30')} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('email')}</FieldLabel>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className={cn(errors.email && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('phone')}</FieldLabel>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)}
                className={cn(errors.phone && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('role')}</FieldLabel>
              <Select value={form.role} onValueChange={v => set('role', v)}>
                <SelectTrigger className={cn(errors.role && 'border-destructive')}>
                  <SelectValue placeholder={t('selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
                  <SelectItem value="mjek">{t('roleDoctor')}</SelectItem>
                  <SelectItem value="recepsion">{t('roleReception')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('specialization')}</FieldLabel>
              <Input value={form.specialization} onChange={e => set('specialization', e.target.value)} placeholder={t('specializationPlaceholder')} />
            </Field>
          </div>
          <Field>
            <FieldLabel>{t('password')}</FieldLabel>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className={cn('pr-10', errors.password && 'border-destructive focus-visible:ring-destructive/30')} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </Field>
          <Field>
            <FieldLabel>{t('confirmPassword')}</FieldLabel>
            <div className="relative">
              <Input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                className={cn('pr-10', errors.confirmPassword && 'border-destructive focus-visible:ring-destructive/30')} />
              <button type="button" onClick={() => setShowConfirm(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
            {loading ? t('adding') : t('addMember')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
