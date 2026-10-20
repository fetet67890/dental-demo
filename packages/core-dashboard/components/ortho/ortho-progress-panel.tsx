"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useData } from '@core/context/data-context'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import { getOrthoProgressions, createOrthoProgression, deleteOrthoProgression } from '@core/lib/api/ortho-progressions'
import { getOrthoStageTemplates } from '@core/lib/api/ortho-stage-templates'
import type { OrthoProgression, OrthoStageTemplate } from '@core/types'

interface OrthoProgressPanelProps {
  /** Restrict to one doctor's own patients (doctor role). Omit to see all (admin). */
  doctorId?: string
  showDoctorColumn?: boolean
}

const CUSTOM_LABEL_VALUE = '__custom__'
const EMPTY_FORM = { patientId: '', doctorId: '', stageLabel: '', customLabel: '', stageDate: '', notes: '' }

export function OrthoProgressPanel({ doctorId, showDoctorColumn = false }: OrthoProgressPanelProps) {
  const t = useTranslations('ortho-progress-panel')
  const { patients, staff } = useData()
  const [entries, setEntries]   = useState<OrthoProgression[]>([])
  const [stageTemplates, setStageTemplates] = useState<OrthoStageTemplate[]>([])
  const [loading, setLoading]   = useState(true)
  const [patientFilter, setPatientFilter] = useState<string>('all')
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const doctors = staff.filter(s => s.role === 'mjek')

  const load = () => {
    setLoading(true)
    getOrthoProgressions(doctorId ? { doctorId } : undefined)
      .then(setEntries)
      .catch(() => toast.error(t('loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [doctorId])
  useEffect(() => {
    getOrthoStageTemplates().then(setStageTemplates).catch(() => {})
  }, [])

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, doctorId: doctorId || '' })
    setAdding(true)
  }

  const handleAdd = async () => {
    const stageLabel = form.stageLabel === CUSTOM_LABEL_VALUE ? form.customLabel.trim() : form.stageLabel
    if (!form.patientId || !form.doctorId || !stageLabel || !form.stageDate) {
      toast.error(t('validationRequired'))
      return
    }
    try {
      setSaving(true)
      await createOrthoProgression({
        patientId: form.patientId,
        doctorId: form.doctorId,
        stageLabel,
        stageDate: form.stageDate,
        notes: form.notes || undefined,
      })
      toast.success(t('addSuccess'))
      setAdding(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë shtimit')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (entry: OrthoProgression) => {
    try {
      await deleteOrthoProgression(entry.id)
      toast.success(t('deleteSuccess'))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  const patientOptions = Array.from(new Map(entries.map(e => [e.patientId, e.patientName])).entries())
  const visible = patientFilter === 'all' ? entries : entries.filter(e => e.patientId === patientFilter)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <div className="flex items-center gap-2">
          {patientOptions.length > 0 && (
            <Select value={patientFilter} onValueChange={setPatientFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPatients')}</SelectItem>
                {patientOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={openAdd}>{t('addStage')}</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="space-y-3">
            {visible.map(e => (
              <li key={e.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
                <div className="text-sm min-w-0">
                  <p className="font-medium truncate">{e.patientName} · {e.stageLabel}</p>
                  <p className="text-muted-foreground">
                    {e.stageDate}{showDoctorColumn && ` · ${e.doctorName}`}
                  </p>
                  {e.notes && <p className="text-muted-foreground italic truncate">{e.notes}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => remove(e)}>{t('delete')}</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t('patient')}</FieldLabel>
              <Select value={form.patientId} onValueChange={(v) => setForm(f => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('selectPatient')} /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {!doctorId && (
              <Field>
                <FieldLabel>{t('doctor')}</FieldLabel>
                <Select value={form.doctorId} onValueChange={(v) => setForm(f => ({ ...f, doctorId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('selectDoctor')} /></SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel>{t('stage')}</FieldLabel>
              <Select value={form.stageLabel} onValueChange={(v) => setForm(f => ({ ...f, stageLabel: v }))}>
                <SelectTrigger><SelectValue placeholder={t('selectStage')} /></SelectTrigger>
                <SelectContent>
                  {stageTemplates.filter(st => st.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(st => (
                    <SelectItem key={st.id} value={st.label}>{st.label}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_LABEL_VALUE}>{t('customOption')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.stageLabel === CUSTOM_LABEL_VALUE && (
              <Field>
                <FieldLabel htmlFor="customStageLabel">{t('customStageLabel')}</FieldLabel>
                <Input id="customStageLabel" value={form.customLabel} onChange={(e) => setForm(f => ({ ...f, customLabel: e.target.value }))} placeholder={t('customStagePlaceholder')} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="stageDate">{t('date')}</FieldLabel>
              <Input id="stageDate" type="date" value={form.stageDate} onChange={(e) => setForm(f => ({ ...f, stageDate: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="stageNotes">{t('notes')}</FieldLabel>
              <Textarea id="stageNotes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>{t('cancel')}</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? t('saving') : t('add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
