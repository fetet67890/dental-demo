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
import { Textarea } from "@core/components/ui/textarea"
import { Switch } from "@core/components/ui/switch"
import { Plus, Phone, AlertCircle, PhoneCall, Play, CheckCircle2, XCircle, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import { getQueue, addToQueue, callFromQueue, updateQueueStatus, type QueueEntry } from "@core/lib/api/queue"
import { getSocket } from "@core/lib/realtime"

const STATUS_CHIP: Record<QueueEntry['status'], string> = {
  duke_pritur: 'chip-neutral',
  thirrur: 'chip-amber',
  ne_sherbim: 'chip-blue',
  perfunduar: 'chip-green',
  anuluar: 'chip-red',
}

export default function RadhaPage() {
  const t = useTranslations('recepsion-radha')
  const STATUS_LABEL: Record<QueueEntry['status'], string> = {
    duke_pritur: t('status.duke_pritur'),
    thirrur: t('status.thirrur'),
    ne_sherbim: t('status.ne_sherbim'),
    perfunduar: t('status.perfunduar'),
    anuluar: t('status.anuluar'),
  }
  const { patients, staff } = useData()
  const doctors = (staff || []).filter((s) => s.role === 'mjek' && s.status === 'aktiv')

  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [form, setForm] = useState({ patientId: '', priority: false, notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [callTargetId, setCallTargetId] = useState<string | null>(null)
  const [callDoctorId, setCallDoctorId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getQueue()
      setEntries(data)
    } catch {
      toast.error('Gabim gjatë ngarkimit të radhës')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Long-interval safety net only — the socket listener below is the
    // primary sync mechanism now, so this rarely needs to fire.
    const interval = setInterval(load, 300_000)
    return () => clearInterval(interval)
  }, [load])

  // Real-time push: apply queue mutations from any staff member instantly.
  // A terminal status (perfunduar/anuluar) drops the row locally, matching
  // what a fresh GET /api/queue (includeDone=false) would already exclude.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const upsertOrDrop = (entry: QueueEntry) => {
      const isTerminal = entry.status === 'perfunduar' || entry.status === 'anuluar'
      setEntries(prev => {
        if (isTerminal) return prev.filter(e => e.id !== entry.id)
        return prev.some(e => e.id === entry.id) ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry]
      })
    }
    const onRemoved = (payload: { id: string }) => setEntries(prev => prev.filter(e => e.id !== payload.id))

    socket.on('queue:added', upsertOrDrop)
    socket.on('queue:updated', upsertOrDrop)
    socket.on('queue:removed', onRemoved)

    return () => {
      socket.off('queue:added', upsertOrDrop)
      socket.off('queue:updated', upsertOrDrop)
      socket.off('queue:removed', onRemoved)
    }
  }, [])

  const handleAdd = async () => {
    if (!form.patientId) { toast.error('Zgjidhni pacientin'); return }
    setSubmitting(true)
    try {
      await addToQueue(form)
      toast.success('Pacienti u shtua në radhë')
      setIsAddOpen(false)
      setForm({ patientId: '', priority: false, notes: '' })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë shtimit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCall = async () => {
    if (!callTargetId || !callDoctorId) { toast.error('Zgjidhni mjekun'); return }
    setSubmitting(true)
    try {
      await callFromQueue(callTargetId, callDoctorId)
      toast.success('Pacienti u thirr')
      setCallTargetId(null)
      setCallDoctorId('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë thirrjes')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (entry: QueueEntry, status: QueueEntry['status']) => {
    setBusyId(entry.id)
    try {
      await updateQueueStatus(entry.id, status)
      load()
    } catch {
      toast.error('Gabim gjatë përditësimit')
    } finally {
      setBusyId(null)
    }
  }

  const waiting = entries.filter((e) => e.status === 'duke_pritur')
  const active = entries.filter((e) => e.status === 'thirrur' || e.status === 'ne_sherbim')

  return (
    <>
      <Topbar title={t('topbar.title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {t('summary', { waiting: waiting.length, active: active.length })}
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
            <Plus className="h-4 w-4" />
            {t('addToQueue')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('empty')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card key={entry.id} className="border-border/50 shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {entry.priority && (
                      <span title={t('urgent')}>
                        <AlertCircle className="h-4 w-4 ic-red shrink-0" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{entry.patientName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{entry.patientPhone}
                        {entry.doctorName && <span>· {entry.doctorName}</span>}
                      </p>
                      {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[entry.status])}>
                      {STATUS_LABEL[entry.status]}
                    </span>
                    {entry.status === 'duke_pritur' && (
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={busyId === entry.id}
                        onClick={() => { setCallTargetId(entry.id); setCallDoctorId('') }}>
                        <PhoneCall className="h-3.5 w-3.5" />{t('call')}
                      </Button>
                    )}
                    {entry.status === 'thirrur' && (
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={busyId === entry.id}
                        onClick={() => handleStatusChange(entry, 'ne_sherbim')}>
                        <Play className="h-3.5 w-3.5" />{t('startService')}
                      </Button>
                    )}
                    {(entry.status === 'thirrur' || entry.status === 'ne_sherbim') && (
                      <Button size="sm" variant="outline" className="gap-1.5 ic-green border-[var(--p-green)]/30 hover:bg-[var(--p-green-bg)]" disabled={busyId === entry.id}
                        onClick={() => handleStatusChange(entry, 'perfunduar')}>
                        <CheckCircle2 className="h-3.5 w-3.5" />{t('finish')}
                      </Button>
                    )}
                    {entry.status === 'duke_pritur' && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busyId === entry.id}
                        onClick={() => handleStatusChange(entry, 'anuluar')}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add to queue */}
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
            <div className="flex items-center justify-between">
              <FieldLabel>{t('addDialog.priority')}</FieldLabel>
              <Switch checked={form.priority} onCheckedChange={(v) => setForm({ ...form, priority: v })} />
            </div>
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

      {/* Call patient — pick a doctor */}
      <Dialog open={!!callTargetId} onOpenChange={(o) => { if (!o) setCallTargetId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('callDialog.title')}</DialogTitle></DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>{t('callDialog.doctor')}</FieldLabel>
              <Select value={callDoctorId} onValueChange={setCallDoctorId}>
                <SelectTrigger><SelectValue placeholder={t('callDialog.doctorPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallTargetId(null)}>{t('callDialog.cancel')}</Button>
            <Button onClick={handleCall} disabled={submitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {submitting ? t('callDialog.submitting') : t('callDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
