"use client"

import { useMemo, useState } from 'react'
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
import { treatmentTypes } from '@core/lib/constants'
import { AllergyAlert } from '@core/components/patient/allergy-alert'
import { computeResourceLoad, getLeastBusy } from '@core/lib/scheduling-load'
import { Sparkles } from 'lucide-react'

const EMPTY = { patientId: '', doctorId: '', date: '', time: '', duration: '30', type: '' }

interface Props { open: boolean; onClose: () => void }

export function AddAppointmentDialog({ open, onClose }: Props) {
  const t = useTranslations('add-appointment-dialog')
  const { patients, staff, services, rooms, addAppointment, appointments } = useData()
  const doctors = (staff || []).filter(s => s.role === 'mjek' && s.status === 'aktiv')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('__none__')
  const [selectedRoomId, setSelectedRoomId] = useState('__none__')

  // "Intelligent duration": picking a service from the catalog auto-fills both
  // the visit type and its typical duration — still manually overridable after.
  const handleServiceSelect = (id: string) => {
    setSelectedServiceId(id)
    if (id === '__none__') return
    const svc = services.find(s => s.id === id)
    if (svc) setForm(f => ({ ...f, type: svc.name, duration: String(svc.duration) }))
  }

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const handleClose = () => { setForm(EMPTY); setErrors({}); setSelectedServiceId('__none__'); setSelectedRoomId('__none__'); onClose() }

  const selectedPatient = patients.find(p => p.id === form.patientId)

  // "Who's least busy that day" — a live heuristic to help balance load,
  // shown only while no doctor has been picked yet for the chosen date.
  const recommendedDoctor = useMemo(() => {
    if (!form.date || form.doctorId) return null
    const loads = computeResourceLoad(doctors, appointments, form.date, a => a.doctorId || a.doktorId)
    const [best] = getLeastBusy(loads)
    return best || null
  }, [form.date, form.doctorId, doctors, appointments])

  const handleSubmit = async () => {

    const conflict = appointments.some(a =>
      a.doctorId === form.doctorId && a.date === form.date &&
      a.time === form.time && a.status !== 'anuluar' && a.status !== 'mungoi'
    )
    if (conflict) { toast.error('Ky mjek ka takim tjetër në këtë kohë!'); return }

    if (selectedRoomId !== '__none__') {
      const roomConflict = appointments.some(a =>
        a.roomId === selectedRoomId && a.date === form.date &&
        a.time === form.time && a.status !== 'anuluar' && a.status !== 'mungoi'
      )
      if (roomConflict) { toast.error('Kjo dhomë/karrige është e zënë në këtë kohë!'); return }
    }

    const patient = patients.find(p => p.id === form.patientId)
    const doctor = doctors.find(d => d.id === form.doctorId)
    if (!patient || !doctor) { toast.error('Pacienti ose mjeku nuk u gjet'); return }

    setLoading(true)
    try {
      await addAppointment({
        patientId: form.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorId: form.doctorId,
        doctorName: doctor.name,
        date: form.date,
        time: form.time,
        duration: parseInt(form.duration) || 30,
        type: form.type,
        serviceId: selectedServiceId !== '__none__' ? selectedServiceId : undefined,
        roomId: selectedRoomId !== '__none__' ? selectedRoomId : undefined,
        status: 'planifikuar',
      })
      toast.success('Takimi u krijua me sukses')
      handleClose()
    } catch (err) {
      toastError(err, 'Gabim gjatë ruajtjes së takimit')
    } finally { setLoading(false) }
  }

  return (
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
                {(patients || []).filter(p => !p.archived && p.status === 'aktiv').map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.patientId && <p className="text-xs text-destructive mt-1">{errors.patientId}</p>}
          </Field>
          <AllergyAlert allergies={selectedPatient?.allergies} />
          <Field>
            <FieldLabel>{t('doctor')}</FieldLabel>
            <Select value={form.doctorId} onValueChange={v => set('doctorId', v)}>
              <SelectTrigger className={cn(errors.doctorId && 'border-destructive')}>
                <SelectValue placeholder={t('selectDoctor')} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctorId && <p className="text-xs text-destructive mt-1">{errors.doctorId}</p>}
            {recommendedDoctor && (
              <button
                type="button"
                onClick={() => set('doctorId', recommendedDoctor.id)}
                className="flex items-center gap-1.5 mt-1.5 text-xs ic-green hover:underline"
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                {recommendedDoctor.count === 0
                  ? t('recommendedNoAppointments', { name: recommendedDoctor.name })
                  : t('recommendedFewerAppointments', { name: recommendedDoctor.name, count: recommendedDoctor.count })}
              </button>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('date')}</FieldLabel>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className={cn(errors.date && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('time')}</FieldLabel>
              <Input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                className={cn(errors.time && 'border-destructive focus-visible:ring-destructive/30')} />
              {errors.time && <p className="text-xs text-destructive mt-1">{errors.time}</p>}
            </Field>
          </div>
          {services.length > 0 && (
            <Field>
              <FieldLabel>{t('catalogService')}</FieldLabel>
              <Select value={selectedServiceId} onValueChange={handleServiceSelect}>
                <SelectTrigger><SelectValue placeholder={t('selectService')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('noCatalogService')}</SelectItem>
                  {services.filter(s => s.isActive).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.duration} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {rooms.length > 0 && (
            <Field>
              <FieldLabel>{t('room')}</FieldLabel>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger><SelectValue placeholder={t('selectRoom')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('noRoom')}</SelectItem>
                  {rooms.filter(r => r.isActive).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('visitType')}</FieldLabel>
              <Input
                value={form.type}
                onChange={e => set('type', e.target.value)}
                placeholder={t('visitTypePlaceholder')}
                list="appointment-types"
                className={cn(errors.type && 'border-destructive focus-visible:ring-destructive/30')}
              />
              <datalist id="appointment-types">
                {treatmentTypes.map(tt => <option key={tt} value={tt} />)}
              </datalist>
              {errors.type && <p className="text-xs text-destructive mt-1">{errors.type}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('duration')}</FieldLabel>
              <Select value={form.duration} onValueChange={v => set('duration', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['15','30','45','60','90','120'].map(d => (
                    <SelectItem key={d} value={d}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
            {loading ? t('saving') : t('createAppointment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
