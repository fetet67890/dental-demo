"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Textarea } from '@core/components/ui/textarea'
import { Input } from '@core/components/ui/input'
import { Field, FieldLabel } from '@core/components/ui/field'
import { StatusBadge } from '@core/components/ui/status-badge'
import { Tabs, TabsList, TabsTrigger } from '@core/components/ui/tabs'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@core/components/ui/dropdown-menu'
import { getFollowups, updateFollowup, deleteFollowup } from '@core/lib/api/treatment-followups'
import type { TreatmentFollowup } from '@core/types'

type FilterTab = 'ne_pritje' | 'vonuar' | 'kryer' | 'te_gjitha'

interface FollowupPanelProps {
  /** Restrict to one doctor's own follow-ups (doctor role). Omit to see all (admin/reception). */
  doctorId?: string
  showDoctorColumn?: boolean
}

export function FollowupPanel({ doctorId, showDoctorColumn = false }: FollowupPanelProps) {
  const t = useTranslations('followup-panel')
  const [followups, setFollowups] = useState<TreatmentFollowup[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<FilterTab>('ne_pritje')
  const [editing, setEditing]     = useState<TreatmentFollowup | null>(null)
  const [editDate, setEditDate]   = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving]       = useState(false)

  const load = () => {
    setLoading(true)
    getFollowups(doctorId ? { doctorId } : undefined)
      .then(setFollowups)
      .catch(() => toast.error('Gabim gjatë ngarkimit të kontrolleve'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [doctorId])

  const todayStr = new Date().toISOString().slice(0, 10)
  const isOverdue = (f: TreatmentFollowup) => f.status === 'ne_pritje' && f.dueDate < todayStr

  const visible = followups.filter(f => {
    if (tab === 'te_gjitha') return true
    if (tab === 'vonuar') return isOverdue(f)
    if (tab === 'ne_pritje') return f.status === 'ne_pritje' && !isOverdue(f)
    return f.status === tab
  })

  const setStatus = async (f: TreatmentFollowup, status: TreatmentFollowup['status']) => {
    try {
      await updateFollowup(f.id, { status })
      toast.success('Statusi u përditësua')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë përditësimit')
    }
  }

  const openEdit = (f: TreatmentFollowup) => {
    setEditing(f)
    setEditDate(f.dueDate)
    setEditNotes(f.notes || '')
  }

  const saveEdit = async () => {
    if (!editing) return
    try {
      setSaving(true)
      await updateFollowup(editing.id, { dueDate: editDate, notes: editNotes || undefined })
      toast.success('Kontrolli u përditësua')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (f: TreatmentFollowup) => {
    try {
      await deleteFollowup(f.id)
      toast.success('Kontrolli u fshi')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  const counts = {
    ne_pritje: followups.filter(f => f.status === 'ne_pritje' && !isOverdue(f)).length,
    vonuar:    followups.filter(isOverdue).length,
    kryer:     followups.filter(f => f.status === 'kryer').length,
    te_gjitha: followups.length,
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="ne_pritje">{t('tabs.pending', { count: counts.ne_pritje })}</TabsTrigger>
            <TabsTrigger value="vonuar">{t('tabs.overdue', { count: counts.vonuar })}</TabsTrigger>
            <TabsTrigger value="kryer">{t('tabs.completed', { count: counts.kryer })}</TabsTrigger>
            <TabsTrigger value="te_gjitha">{t('tabs.all', { count: counts.te_gjitha })}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="space-y-3">
            {visible.map(f => (
              <li key={f.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
                <div className="text-sm min-w-0">
                  <p className="font-medium truncate">{f.patientName} · {f.label}</p>
                  <p className="text-muted-foreground">
                    {f.treatmentType} · {t('due')}: <span className={isOverdue(f) ? 'text-destructive font-medium' : ''}>{f.dueDate}</span>
                    {showDoctorColumn && ` · ${f.doctorName}`}
                  </p>
                  {f.notes && <p className="text-muted-foreground italic truncate">{f.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={isOverdue(f) ? 'humbur' : f.status} />
                  {f.status === 'ne_pritje' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">{t('actions')}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStatus(f, 'kryer')}>{t('markCompleted')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(f)}>{t('editDateNotes')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(f, 'humbur')}>{t('markMissed')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(f, 'anuluar')}>{t('cancelFollowup')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => remove(f)} className="text-destructive">{t('delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="followupDate">{t('followupDate')}</FieldLabel>
              <Input id="followupDate" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="followupNotes">{t('notes')}</FieldLabel>
              <Textarea id="followupNotes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('cancel')}</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? t('saving') : t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
