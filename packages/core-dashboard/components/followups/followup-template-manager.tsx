"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import {
  getFollowupTemplates, createFollowupTemplate, updateFollowupTemplate, deleteFollowupTemplate,
} from '@core/lib/api/followup-templates'
import { treatmentTypes } from '@core/lib/constants'
import type { FollowupTemplate } from '@core/types'

const EMPTY_FORM = { treatmentType: '', label: '', daysAfter: '' }

export function FollowupTemplateManager() {
  const t = useTranslations('followup-template-manager')
  const [templates, setTemplates] = useState<FollowupTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<FollowupTemplate | null>(null)
  const [adding, setAdding]       = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)

  const load = () => {
    setLoading(true)
    getFollowupTemplates()
      .then(setTemplates)
      .catch(() => toast.error('Gabim gjatë ngarkimit të shablloneve'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const grouped = templates.reduce<Record<string, FollowupTemplate[]>>((acc, t) => {
    (acc[t.treatmentType] ||= []).push(t)
    return acc
  }, {})

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setAdding(true) }
  const openEdit = (t: FollowupTemplate) => {
    setForm({ treatmentType: t.treatmentType, label: t.label, daysAfter: String(t.daysAfter) })
    setEditing(t)
    setAdding(true)
  }

  const handleSave = async () => {
    const daysAfter = parseInt(form.daysAfter, 10)
    if (!form.treatmentType || !form.label || Number.isNaN(daysAfter)) {
      toast.error('Lloji i trajtimit, etiketa dhe ditët janë të detyrueshme')
      return
    }
    try {
      setSaving(true)
      if (editing) {
        await updateFollowupTemplate(editing.id, { treatmentType: form.treatmentType, label: form.label, daysAfter })
        toast.success('Shablloni u përditësua')
      } else {
        const sortOrder = (grouped[form.treatmentType]?.length || 0) + 1
        await createFollowupTemplate({ treatmentType: form.treatmentType, label: form.label, daysAfter, sortOrder })
        toast.success('Shablloni u shtua')
      }
      setAdding(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: FollowupTemplate) => {
    try {
      await deleteFollowupTemplate(t.id)
      toast.success('Shablloni u fshi')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <Button size="sm" onClick={openAdd}>{t('addSequenceFollowup')}</Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          {t('description')}
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([type, rows]) => (
              <div key={type}>
                <p className="text-sm font-semibold mb-2">{type}</p>
                <ul className="space-y-2">
                  {rows.sort((a, b) => a.sortOrder - b.sortOrder).map(tpl => (
                    <li key={tpl.id} className="flex items-center justify-between gap-3 text-sm border-b pb-2 last:border-0">
                      <span>{t('dayLabel', { days: tpl.daysAfter, label: tpl.label })}</span>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openEdit(tpl)}>{t('edit')}</Button>
                        <Button size="sm" variant="outline" onClick={() => remove(tpl)}>{t('delete')}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('editFollowupTitle') : t('addSequenceFollowupTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t('treatmentType')}</FieldLabel>
              <Select value={form.treatmentType} onValueChange={(v) => setForm(f => ({ ...f, treatmentType: v }))}>
                <SelectTrigger><SelectValue placeholder={t('selectTreatmentType')} /></SelectTrigger>
                <SelectContent>
                  {treatmentTypes.map(tt => <SelectItem key={tt} value={tt}>{tt}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="tplLabel">{t('followupLabel')}</FieldLabel>
              <Input id="tplLabel" value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} placeholder={t('followupLabelPlaceholder')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="tplDays">{t('daysAfterTreatment')}</FieldLabel>
              <Input id="tplDays" type="number" min="0" value={form.daysAfter} onChange={(e) => setForm(f => ({ ...f, daysAfter: e.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('saving') : t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
