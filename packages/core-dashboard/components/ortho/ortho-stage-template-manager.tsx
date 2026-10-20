"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Field, FieldLabel } from '@core/components/ui/field'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import {
  getOrthoStageTemplates, createOrthoStageTemplate, updateOrthoStageTemplate, deleteOrthoStageTemplate,
} from '@core/lib/api/ortho-stage-templates'
import type { OrthoStageTemplate } from '@core/types'

export function OrthoStageTemplateManager() {
  const t = useTranslations('ortho-stage-template-manager')
  const [templates, setTemplates] = useState<OrthoStageTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<OrthoStageTemplate | null>(null)
  const [adding, setAdding]       = useState(false)
  const [label, setLabel]         = useState('')
  const [saving, setSaving]       = useState(false)

  const load = () => {
    setLoading(true)
    getOrthoStageTemplates()
      .then(setTemplates)
      .catch(() => toast.error('Gabim gjatë ngarkimit të fazave'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sorted = [...templates].sort((a, b) => a.sortOrder - b.sortOrder)

  const openAdd = () => { setLabel(''); setEditing(null); setAdding(true) }
  const openEdit = (t: OrthoStageTemplate) => { setLabel(t.label); setEditing(t); setAdding(true) }

  const handleSave = async () => {
    if (!label.trim()) { toast.error('Etiketa e fazës është e detyrueshme'); return }
    try {
      setSaving(true)
      if (editing) {
        await updateOrthoStageTemplate(editing.id, { label })
        toast.success('Faza u përditësua')
      } else {
        await createOrthoStageTemplate({ label, sortOrder: sorted.length + 1 })
        toast.success('Faza u shtua')
      }
      setAdding(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: OrthoStageTemplate) => {
    try {
      await deleteOrthoStageTemplate(t.id)
      toast.success('Faza u fshi')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <Button size="sm" onClick={openAdd}>{t('addStage')}</Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          {t('description')}
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map(tpl => (
              <li key={tpl.id} className="flex items-center justify-between gap-3 text-sm border-b pb-2 last:border-0">
                <span>{tpl.label}</span>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(tpl)}>{t('edit')}</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(tpl)}>{t('delete')}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('editStageTitle') : t('addStageTitle')}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="stageTplLabel">{t('stageName')}</FieldLabel>
            <Input id="stageTplLabel" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('stageNamePlaceholder')} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('saving') : t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
