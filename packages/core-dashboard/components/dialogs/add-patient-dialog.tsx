"use client"

// Extra patient fields (e.g. Dermatology's Fitzpatrick skin type) render
// generically from useSpecialtyConfig().patientExtraFields instead of being
// hardcoded here — see ../../lib/specialty-config.ts's PatientExtraField
// shape. A specialty with none renders nothing extra at all.
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { useData } from '@core/context/data-context'
import { toast } from 'sonner'
import { toastError } from '@core/lib/toast-error'
import { cn } from '@core/lib/utils'
import { referralSources } from '@core/lib/constants'
import { useSpecialtyConfig } from '../../context/specialty-config-context'

const EMPTY = {
  firstName: '', lastName: '', phone: '', email: '',
  dateOfBirth: '', gender: '' as 'M' | 'F' | '',
  bloodType: '', address: '', allergies: '', medicalNotes: '', assignedDoctorId: '',
  referralSource: '',
}

interface Props { open: boolean; onClose: () => void }

export function AddPatientDialog({ open, onClose }: Props) {
  const t = useTranslations('add-patient-dialog')
  const tSource = useTranslations('referral-sources')
  const { addPatient, addAppointment, staff } = useData()
  const { patientExtraFields } = useSpecialtyConfig()
  const doctors = (staff || []).filter(s => s.role === 'mjek' && s.status === 'aktiv')
  const [form, setForm] = useState(EMPTY)
  // Extra fields are a separate, dynamically-keyed bag (their keys aren't
  // known until specialty.config.ts is read) rather than folded into EMPTY.
  const [extraForm, setExtraForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }
  const setExtra = (k: string, v: string) => setExtraForm(f => ({ ...f, [k]: v }))

  const handleClose = () => { setForm(EMPTY); setExtraForm({}); setErrors({}); onClose() }

  const handleSubmit = async () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = t('errors.firstNameRequired')
    if (!form.lastName.trim()) e.lastName = t('errors.lastNameRequired')
    if (!form.phone.trim()) e.phone = t('errors.phoneRequired')
    if (Object.keys(e).length) { setErrors(e); toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.'); return }
    setLoading(true)
    try {
      const extraValues = Object.fromEntries(
        patientExtraFields
          .filter(f => extraForm[f.jsonKey])
          .map(f => [f.jsonKey, f.inputType === 'number' ? Number(extraForm[f.jsonKey]) : extraForm[f.jsonKey]])
      )
      // Assigned to a variable (not passed as an inline literal) so
      // TypeScript's excess-property check doesn't reject the dynamically-
      // keyed ...extraValues spread — addPatient's own param type only
      // knows the generic fields, not whatever a specialty adds.
      const payload = {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        phone: form.phone.trim(), email: form.email.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: (form.gender || 'M') as 'M' | 'F',
        bloodType: form.bloodType || undefined,
        referralSource: form.referralSource || undefined,
        address: form.address.trim(),
        medicalHistory: form.medicalNotes.trim() ? [form.medicalNotes.trim()] : [],
        allergies: form.allergies ? form.allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
        status: 'aktiv' as const,
        ...extraValues,
      }
      const created = await addPatient(payload)
      if (form.assignedDoctorId && created?.id) {
        const doctor = doctors.find(d => d.id === form.assignedDoctorId)
        await addAppointment({
          patientId: created.id,
          patientName: `${form.firstName.trim()} ${form.lastName.trim()}`,
          doctorId: form.assignedDoctorId,
          doctorName: doctor?.name || '',
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          duration: 30,
          type: 'konsultim',
          status: 'ne_pritje',
        }).catch(() => {})
      }
      toast.success('Pacienti u shtua me sukses')
      handleClose()
    } catch (err) {
      toastError(err, 'Gabim gjatë shtimit të pacientit')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('firstName')}</FieldLabel>
              <Input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                className={cn(errors.firstName && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('lastName')}</FieldLabel>
              <Input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                className={cn(errors.lastName && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('phone')}</FieldLabel>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)}
                className={cn(errors.phone && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('email')}</FieldLabel>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>{t('dateOfBirth')}</FieldLabel>
              <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>{t('gender')}</FieldLabel>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">{t('male')}</SelectItem>
                  <SelectItem value="F">{t('female')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('bloodType')}</FieldLabel>
              <Select value={form.bloodType} onValueChange={v => set('bloodType', v)}>
                <SelectTrigger><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {/* Specialty-declared extra fields (e.g. Dermatology's Fitzpatrick
              skin type) — one per config entry, generic text/number input. */}
          {patientExtraFields.length > 0 && (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(patientExtraFields.length, 3)}, minmax(0, 1fr))` }}>
              {patientExtraFields.map(f => (
                <Field key={f.jsonKey}>
                  <FieldLabel>{t(f.labelKey)}</FieldLabel>
                  <Input
                    type={f.inputType === 'number' ? 'number' : 'text'}
                    value={extraForm[f.jsonKey] || ''}
                    onChange={e => setExtra(f.jsonKey, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          )}
          <Field>
            <FieldLabel>{t('address')}</FieldLabel>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder={t('addressPlaceholder')} />
          </Field>
          <Field>
            <FieldLabel>{t('referralSource')}</FieldLabel>
            <Select value={form.referralSource || '__none__'} onValueChange={v => set('referralSource', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('unspecified')}</SelectItem>
                {referralSources.map(src => (
                  <SelectItem key={src} value={src}>{tSource(src)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t('assignedDoctor')}</FieldLabel>
            <Select value={form.assignedDoctorId || '__none__'} onValueChange={v => set('assignedDoctorId', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder={t('selectDoctor')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('noDoctor')}</SelectItem>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {doctors.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">{t('noActiveDoctors')}</p>
            )}
          </Field>
          <Field>
            <FieldLabel>{t('allergies')}</FieldLabel>
            <Input value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder={t('allergiesPlaceholder')} />
          </Field>
          <Field>
            <FieldLabel>{t('medicalNotes')}</FieldLabel>
            <Textarea value={form.medicalNotes} onChange={e => set('medicalNotes', e.target.value)}
              placeholder={t('medicalNotesPlaceholder')} className="resize-none h-20" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
            {loading ? t('adding') : t('addPatient')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
