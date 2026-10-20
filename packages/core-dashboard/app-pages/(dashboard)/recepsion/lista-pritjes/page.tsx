"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import { FieldGroup, Field, FieldLabel } from "@core/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import { Input } from "@core/components/ui/input"
import { Textarea } from "@core/components/ui/textarea"
import { ListPlus, CalendarClock, Bell, Trash2, Loader2, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import { getWaitlist, addToWaitlist, removeFromWaitlist, type WaitlistEntry } from "@core/lib/api/waitlist"

const STATUS_CHIP: Record<WaitlistEntry['status'], string> = {
  aktiv: 'chip-neutral',
  njoftuar: 'chip-blue',
  plotesuar: 'chip-green',
  anuluar: 'chip-red',
}

export default function ListaPritjesPage() {
  const t = useTranslations('recepsion-lista-pritjes')
  const STATUS_LABEL: Record<WaitlistEntry['status'], string> = {
    aktiv: t('status.aktiv'),
    njoftuar: t('status.njoftuar'),
    plotesuar: t('status.plotesuar'),
    anuluar: t('status.anuluar'),
  }
  const { patients, staff } = useData()
  const doctors = (staff || []).filter((s) => s.role === 'mjek' && s.status === 'aktiv')

  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [form, setForm] = useState({ patientId: '', doctorId: '__any__', preferredDate: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getWaitlist()
      setEntries(data)
    } catch {
      toast.error('Gabim gjatë ngarkimit të listës')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.patientId) { toast.error('Zgjidhni pacientin'); return }
    setSubmitting(true)
    try {
      await addToWaitlist({
        patientId: form.patientId,
        doctorId: form.doctorId === '__any__' ? undefined : form.doctorId,
        preferredDate: form.preferredDate || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Pacienti u shtua në listën e pritjes')
      setIsAddOpen(false)
      setForm({ patientId: '', doctorId: '__any__', preferredDate: '', notes: '' })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë shtimit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeFromWaitlist(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {
      toast.error('Gabim gjatë heqjes')
    }
  }

  return (
    <>
      <Topbar title={t('topbar.title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t('count', { count: entries.length })}</p>
          <Button onClick={() => setIsAddOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
            <ListPlus className="h-4 w-4" />
            {t('addToList')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('empty')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card key={entry.id} className="border-border/50 shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{entry.patientName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      {entry.doctorName ? <span>{entry.doctorName}</span> : <span>{t('anyDoctor')}</span>}
                      {entry.preferredDate && (
                        <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{entry.preferredDate.substring(0, 10)}</span>
                      )}
                    </p>
                    {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                    {entry.status === 'njoftuar' && (
                      <p className="text-xs ic-blue flex items-center gap-1 mt-1"><Bell className="h-3 w-3" />{t('autoNotified')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[entry.status])}>
                      {STATUS_LABEL[entry.status]}
                    </span>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemove(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('addDialog.title')}</DialogTitle></DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>{t('addDialog.patient')}</FieldLabel>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder={t('addDialog.patientPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {patients.filter((p) => !p.archived && p.status === 'aktiv').map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('addDialog.doctor')}</FieldLabel>
              <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">{t('anyDoctor')}</SelectItem>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('addDialog.preferredDate')}</FieldLabel>
              <Input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>{t('addDialog.notes')}</FieldLabel>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="resize-none" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>{t('addDialog.cancel')}</Button>
            <Button onClick={handleAdd} disabled={submitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {submitting ? t('addDialog.submitting') : t('addDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
