"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@core/components/ui/alert-dialog'
import { useData } from '@core/context/data-context'
import { useAuth } from '@core/context/auth-context'
import { toast } from 'sonner'
import { toastError } from '@core/lib/toast-error'
import { cn } from '@core/lib/utils'
import { AllergyAlert } from '@core/components/patient/allergy-alert'
import { DictateButton } from '@core/components/ui/dictate-button'
import { ApiError } from '@core/lib/api-client'

const EMPTY = { patientId: '', medication: '', dosage: '', frequency: '', duration: '', instructions: '' }

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props { open: boolean; onClose: () => void }

export function AddPrescriptionDialog({ open, onClose }: Props) {
  const t = useTranslations('add-prescription-dialog')
  const { user } = useAuth()
  const { patients, addPrescription } = useData()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [allergyWarning, setAllergyWarning] = useState<string | null>(null)

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const handleClose = () => { setForm(EMPTY); setErrors({}); setAllergyWarning(null); onClose() }

  const submitPrescription = async (acknowledgeAllergies = false) => {
    const patient = patients.find(p => p.id === form.patientId)
    await addPrescription({
      patientId: form.patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
      doctorId: user?.id || '',
      doctorName: user?.name || '',
      medication: form.medication.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency.trim(),
      duration: form.duration.trim(),
      instructions: form.instructions.trim(),
      issuedDate: localDateStr(),
      acknowledgeAllergies,
    })
    toast.success('Receta u shtua me sukses')
    handleClose()
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await submitPrescription(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAllergyWarning(err.message)
      } else {
        toastError(err, 'Gabim gjatë shtimit të recetës')
      }
    } finally { setLoading(false) }
  }

  const handleConfirmAllergy = async () => {
    setLoading(true)
    try {
      await submitPrescription(true)
    } catch (err) {
      toastError(err, 'Gabim gjatë shtimit të recetës')
    } finally {
      setLoading(false)
      setAllergyWarning(null)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('title')}</DialogTitle></DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel>{t('patient')}</FieldLabel>
            <Select value={form.patientId} onValueChange={v => set('patientId', v)}>
              <SelectTrigger className={cn(errors.patientId && 'border-destructive')}>
                <SelectValue placeholder={t('selectPatient')} />
              </SelectTrigger>
              <SelectContent>
                {(patients || []).filter(p => !p.archived).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.patientId && <p className="text-xs text-destructive mt-1">{errors.patientId}</p>}
          </Field>
          <AllergyAlert allergies={patients.find(p => p.id === form.patientId)?.allergies} />
          <Field>
            <FieldLabel>{t('medication')}</FieldLabel>
            <Input value={form.medication} onChange={e => set('medication', e.target.value)}
              className={cn(errors.medication && 'border-destructive focus-visible:ring-destructive/30')} />
            {errors.medication && <p className="text-xs text-destructive mt-1">{errors.medication}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('dosage')}</FieldLabel>
              <Input value={form.dosage} onChange={e => set('dosage', e.target.value)} placeholder={t('dosagePlaceholder')}
                className={cn(errors.dosage && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.dosage && <p className="text-xs text-destructive mt-1">{errors.dosage}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('frequency')}</FieldLabel>
              <Input value={form.frequency} onChange={e => set('frequency', e.target.value)} placeholder={t('frequencyPlaceholder')} />
            </Field>
          </div>
          <Field>
            <FieldLabel>{t('duration')}</FieldLabel>
            <Input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder={t('durationPlaceholder')} />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>{t('instructions')}</FieldLabel>
              <DictateButton onTranscript={(text) => setForm(f => ({ ...f, instructions: (f.instructions ? f.instructions + ' ' : '') + text }))} />
            </div>
            <Textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
              placeholder={t('instructionsPlaceholder')} className="resize-none h-20" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
            {loading ? t('adding') : t('addPrescription')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!allergyWarning} onOpenChange={(open) => { if (!open) setAllergyWarning(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('allergyWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{allergyWarning}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmAllergy} className="bg-destructive hover:bg-destructive/90 text-white">
            {t('continueAnyway')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
