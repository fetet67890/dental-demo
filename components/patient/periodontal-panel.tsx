"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Card, CardContent } from "@core/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@core/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import { Switch } from "@core/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@core/components/ui/table"
import { Plus, Trash2, Activity, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from 'next-intl'
import { cn } from "@core/lib/utils"
import {
  getPeriodontalRecords, createPeriodontalRecord, deletePeriodontalRecord, type PeriodontalRecord,
} from "@/lib/api/periodontal"

const TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
]

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY = { toothNumber: '', pocketDepth: '', recession: '0', bleeding: false, notes: '' }

interface Props {
  patientId: string
  canEdit?: boolean
}

export function PeriodontalPanel({ patientId, canEdit = true }: Props) {
  const t = useTranslations('periodontal-panel')
  const [records, setRecords] = useState<PeriodontalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPeriodontalRecords(patientId)
      setRecords(data)
    } catch {
      toast.error('Gabim gjatë ngarkimit të të dhënave periodontale')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const tooth = parseInt(form.toothNumber, 10)
    const pocket = parseFloat(form.pocketDepth)
    if (!tooth || isNaN(pocket)) { toast.error('Zgjidhni dhëmbin dhe vendosni thellësinë e xhepit'); return }

    setSubmitting(true)
    try {
      await createPeriodontalRecord({
        patientId,
        toothNumber: tooth,
        pocketDepth: pocket,
        recession: parseFloat(form.recession) || 0,
        bleeding: form.bleeding,
        notes: form.notes || undefined,
        recordedAt: localDateStr(),
      })
      toast.success('Matja u regjistrua')
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePeriodontalRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch {
      toast.error('Gabim gjatë fshirjes')
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <p className="font-semibold text-sm text-foreground">{t('heading')}</p>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />{t('recordMeasurement')}
            </Button>
          )}
        </div>

        {showForm && (
          <div className="p-4 bg-secondary/30 rounded-xl space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field>
                <FieldLabel>{t('tooth')}</FieldLabel>
                <Select value={form.toothNumber} onValueChange={(v) => setForm({ ...form, toothNumber: v })}>
                  <SelectTrigger><SelectValue placeholder="#" /></SelectTrigger>
                  <SelectContent>
                    {TEETH.map((tooth) => <SelectItem key={tooth} value={String(tooth)}>{tooth}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>{t('pocketMm')}</FieldLabel>
                <Input type="number" step="0.5" min="0" value={form.pocketDepth} onChange={(e) => setForm({ ...form, pocketDepth: e.target.value })} placeholder="3.0" />
              </Field>
              <Field>
                <FieldLabel>{t('recessionMm')}</FieldLabel>
                <Input type="number" step="0.5" min="0" value={form.recession} onChange={(e) => setForm({ ...form, recession: e.target.value })} />
              </Field>
              <FieldGroup className="justify-end">
                <FieldLabel>{t('bleeding')}</FieldLabel>
                <Switch checked={form.bleeding} onCheckedChange={(v) => setForm({ ...form, bleeding: v })} />
              </FieldGroup>
            </div>
            <Field>
              <FieldLabel>{t('notes')}</FieldLabel>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('notesPlaceholder')} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY) }}>{t('cancel')}</Button>
              <Button size="sm" onClick={handleAdd} disabled={submitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {submitting ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.date')}</TableHead>
                  <TableHead>{t('table.tooth')}</TableHead>
                  <TableHead>{t('table.pocket')}</TableHead>
                  <TableHead>{t('table.recession')}</TableHead>
                  <TableHead>{t('table.bleeding')}</TableHead>
                  {canEdit && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{r.recordedAt?.substring(0, 10)}</TableCell>
                    <TableCell className="font-medium">#{r.toothNumber}</TableCell>
                    <TableCell className={cn(r.pocketDepth >= 4 && 'ic-red font-semibold')}>{r.pocketDepth} mm</TableCell>
                    <TableCell>{r.recession} mm</TableCell>
                    <TableCell>{r.bleeding ? <span className="chip-red text-xs px-2 py-0.5 rounded-full">{t('yes')}</span> : '—'}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
