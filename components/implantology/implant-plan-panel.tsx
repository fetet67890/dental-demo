"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Label } from '@core/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { CalendarClock, Loader2, Plus, Trash2, Pencil } from 'lucide-react'
import {
  getImplantPlans, deleteImplantPlan, addImplantPlanStage, deleteImplantPlanStage, updateImplantPlanStage,
} from '@/lib/api/implant-plans'
import { createAppointment } from '@core/lib/api/appointments'
import { useData } from '@core/context/data-context'
import type { ImplantPlan, ImplantPlanStage, PlanStatus } from '@/types/specialty'
import { fmtLEK } from '@core/lib/currency'
import { cn, fmtDate } from '@core/lib/utils'

interface ImplantPlanPanelProps {
  // Embedded on a single patient's page: pass patientId, add-button links
  // pre-filled for that patient. Standalone "all my patients" view (the
  // doctor nav page): pass doctorId instead, patient name shown per row.
  patientId?: string
  doctorId?: string
}

const STAGE_STATUS_DOT: Record<PlanStatus, string> = {
  planifikuar: 'bg-muted-foreground/40',
  ne_proces:   'dot-amber',
  perfunduar:  'dot-green',
}

// ── Schedule/reschedule dialog — creates a real appointment on the
// clinic's calendar (via the same endpoint the appointments pages use) and
// links it to this stage, instead of the old free-text date field. ────────
function ScheduleStageDialog({
  open, onOpenChange, plan, stage, onScheduled,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: ImplantPlan
  stage: ImplantPlanStage
  onScheduled: (plan: ImplantPlan) => void
}) {
  const t = useTranslations('implant-plan-panel')
  const { refreshAppointments } = useData()
  const [date, setDate] = useState(stage.appointmentDate?.substring(0, 10) || stage.stageDate?.substring(0, 10) || '')
  const [time, setTime] = useState(stage.appointmentTime?.substring(0, 5) || '09:00')
  const [duration, setDuration] = useState('60')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!date || !time) { toast.error(t('scheduleDialog.missingFields')); return }
    setSaving(true)
    try {
      const appointment = await createAppointment({
        patientId: plan.patientId,
        patientName: plan.patientName,
        doctorId: plan.doctorId,
        doctorName: plan.doctorName,
        date,
        time,
        duration: parseInt(duration, 10) || 60,
        type: stage.stageLabel,
        status: 'planifikuar',
        notes: t('scheduleDialog.appointmentNote', { plan: plan.toothNumbers }),
      })
      const updated = await updateImplantPlanStage(plan.id, stage.id, { appointmentId: appointment.id, stageDate: date })
      await refreshAppointments()
      onScheduled(updated)
      toast.success(t('scheduleDialog.success'))
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('scheduleDialog.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('scheduleDialog.title', { stage: stage.stageLabel })}</DialogTitle>
          <DialogDescription>{t('scheduleDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('scheduleDialog.date')}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('scheduleDialog.time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('scheduleDialog.duration')}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 {t('scheduleDialog.minutesUnit')}</SelectItem>
                <SelectItem value="45">45 {t('scheduleDialog.minutesUnit')}</SelectItem>
                <SelectItem value="60">60 {t('scheduleDialog.minutesUnit')}</SelectItem>
                <SelectItem value="90">90 {t('scheduleDialog.minutesUnit')}</SelectItem>
                <SelectItem value="120">120 {t('scheduleDialog.minutesUnit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('scheduleDialog.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('scheduleDialog.saving')}</> : t('scheduleDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Add-stage dialog ────────────────────────────────────────────────────
function AddStageDialog({
  open, onOpenChange, plan, onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: ImplantPlan
  onAdded: (plan: ImplantPlan) => void
}) {
  const t = useTranslations('implant-plan-panel')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!label.trim()) { toast.error(t('addStageDialog.missingLabel')); return }
    setSaving(true)
    try {
      const updated = await addImplantPlanStage(plan.id, { stageLabel: label.trim() })
      onAdded(updated)
      toast.success(t('addStageDialog.success'))
      setLabel('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('addStageDialog.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('addStageDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1.5">
          <Label>{t('addStageDialog.label')}</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('addStageDialog.placeholder')} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('scheduleDialog.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('scheduleDialog.saving')}</> : t('addStageDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ImplantPlanPanel({ patientId, doctorId }: ImplantPlanPanelProps) {
  const t = useTranslations('implant-plan-panel')
  const [plans, setPlans]     = useState<ImplantPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState<{ plan: ImplantPlan; stage: ImplantPlanStage } | null>(null)
  const [addingStageTo, setAddingStageTo] = useState<ImplantPlan | null>(null)

  const load = () => {
    setLoading(true)
    getImplantPlans(patientId ? { patientId } : doctorId ? { doctorId } : undefined)
      .then(setPlans)
      .catch(() => toast.error('Gabim gjatë ngarkimit të planeve të implantit'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [patientId, doctorId])

  const replacePlan = (updated: ImplantPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const remove = async (plan: ImplantPlan) => {
    try {
      await deleteImplantPlan(plan.id)
      toast.success('Plani i implantit u fshi')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  const removeStage = async (plan: ImplantPlan, stage: ImplantPlanStage) => {
    try {
      const updated = await deleteImplantPlanStage(plan.id, stage.id)
      replacePlan(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('stageDeleteError'))
    }
  }

  const changeStageStatus = async (plan: ImplantPlan, stage: ImplantPlanStage, status: PlanStatus) => {
    try {
      const updated = await updateImplantPlanStage(plan.id, stage.id, { status })
      replacePlan(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('stageUpdateError'))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        {patientId && (
          <Link href={`/doktor/implantologji/shto?pacient=${patientId}`}>
            <Button size="sm">{t('addPlan')}</Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="space-y-5">
            {plans.map((plan) => (
              <li key={plan.id} className="border-b pb-5 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm min-w-0">
                    <p className="font-medium">
                      {!patientId && `${plan.patientName} · `}
                      {t('toothNumbers', { numbers: plan.toothNumbers })}
                      {plan.brand && ` · ${plan.brand}`}
                      {(plan.diameterMm || plan.lengthMm) && ` (${plan.diameterMm ?? '?'}×${plan.lengthMm ?? '?'}mm)`}
                    </p>
                    <p className="text-muted-foreground">{fmtLEK(plan.cost)}</p>
                    {plan.notes && <p className="text-muted-foreground italic truncate">{plan.notes}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => remove(plan)} className="shrink-0">{t('delete')}</Button>
                </div>

                <div className="mt-3 space-y-1.5">
                  {plan.stages.map((stage) => (
                    <div key={stage.id} className="flex items-center justify-between gap-2 p-2.5 bg-secondary/40 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', STAGE_STATUS_DOT[stage.status])} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{stage.stageLabel}</p>
                          {stage.appointmentId ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarClock className="h-3 w-3 shrink-0" />
                              {stage.appointmentDate && fmtDate(stage.appointmentDate)}
                              {stage.appointmentTime && ` · ${stage.appointmentTime.substring(0, 5)}`}
                            </p>
                          ) : stage.stageDate ? (
                            <p className="text-xs text-muted-foreground">{fmtDate(stage.stageDate)} · {t('notScheduled')}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">{t('notScheduled')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Select value={stage.status} onValueChange={(v) => changeStageStatus(plan, stage, v as PlanStatus)}>
                          <SelectTrigger className="h-7 w-[110px] text-xs border-0 bg-transparent shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planifikuar">{t('status.planifikuar')}</SelectItem>
                            <SelectItem value="ne_proces">{t('status.ne_proces')}</SelectItem>
                            <SelectItem value="perfunduar">{t('status.perfunduar')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                          onClick={() => setScheduling({ plan, stage })}
                        >
                          {stage.appointmentId ? <Pencil className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                          {stage.appointmentId ? t('reschedule') : t('schedule')}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeStage(plan, stage)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setAddingStageTo(plan)}>
                    <Plus className="h-3.5 w-3.5" />
                    {t('addStage')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {scheduling && (
        <ScheduleStageDialog
          open={!!scheduling}
          onOpenChange={(open) => { if (!open) setScheduling(null) }}
          plan={scheduling.plan}
          stage={scheduling.stage}
          onScheduled={replacePlan}
        />
      )}
      {addingStageTo && (
        <AddStageDialog
          open={!!addingStageTo}
          onOpenChange={(open) => { if (!open) setAddingStageTo(null) }}
          plan={addingStageTo}
          onAdded={replacePlan}
        />
      )}
    </Card>
  )
}
