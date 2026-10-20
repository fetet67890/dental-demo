"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { Switch } from '@core/components/ui/switch'
import { Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@core/components/ui/alert-dialog'
import {
  getServicePackages, createServicePackage, updateServicePackage, deleteServicePackage,
} from '@core/lib/api/service-packages'
import { useData } from '@core/context/data-context'
import { fmtLEK } from '@core/lib/currency'
import { Package, Pencil, Trash2 } from 'lucide-react'
import type { ServicePackage } from '@core/lib/api/service-packages'

const EMPTY_FORM = { name: '', description: '', serviceId: '', sessionCount: '', price: '', validityDays: '', isActive: true }

export function ServicePackagesSection() {
  const t = useTranslations('service-packages-section')
  const { services } = useData()
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<ServicePackage | null>(null)
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ServicePackage | null>(null)

  const load = () => {
    setLoading(true)
    getServicePackages()
      .then(setPackages)
      .catch(() => toast.error(t('loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setAdding(true) }
  const openEdit = (pkg: ServicePackage) => {
    setForm({
      name: pkg.name, description: pkg.description || '', serviceId: pkg.serviceId,
      sessionCount: String(pkg.sessionCount), price: String(pkg.price),
      validityDays: pkg.validityDays ? String(pkg.validityDays) : '', isActive: pkg.isActive,
    })
    setEditing(pkg)
    setAdding(true)
  }

  const handleSave = async () => {
    const sessionCount = parseInt(form.sessionCount, 10)
    const price = parseFloat(form.price)
    if (!form.name.trim() || !form.serviceId || !sessionCount || Number.isNaN(price)) {
      toast.error(t('validation'))
      return
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      serviceId: form.serviceId,
      sessionCount,
      price,
      validityDays: form.validityDays ? parseInt(form.validityDays, 10) : undefined,
      isActive: form.isActive,
    }
    try {
      setSaving(true)
      if (editing) {
        await updateServicePackage(editing.id, payload)
        toast.success(t('updated'))
      } else {
        await createServicePackage({ ...payload, sortOrder: packages.length + 1 })
        toast.success(t('created'))
      }
      setAdding(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteServicePackage(deleteTarget.id)
      toast.success(t('deleted'))
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deleteError'))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t('title')}
        </CardTitle>
        <Button size="sm" onClick={openAdd}>{t('add')}</Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">{t('description')}</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="space-y-2">
            {packages.map(pkg => (
              <li key={pkg.id} className="flex items-start justify-between gap-3 text-sm border-b border-border pb-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {pkg.name}
                    {!pkg.isActive && <span className="chip-neutral rounded-full px-1.5 py-0.5 text-[10px] uppercase">{t('inactive')}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('summary', { count: pkg.sessionCount, service: pkg.serviceName || '', price: fmtLEK(pkg.price) })}
                    {pkg.validityDays ? ` · ${t('validFor', { days: pkg.validityDays })}` : ''}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(pkg)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(pkg)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('editTitle') : t('addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="sp-name">{t('fields.name')}</FieldLabel>
              <Input id="sp-name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
            </Field>
            <Field>
              <FieldLabel htmlFor="sp-desc">{t('fields.description')}</FieldLabel>
              <Textarea id="sp-desc" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
            </Field>
            <Field>
              <FieldLabel>{t('fields.service')}</FieldLabel>
              <Select value={form.serviceId} onValueChange={(v) => setForm(f => ({ ...f, serviceId: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('fields.servicePlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="sp-sessions">{t('fields.sessionCount')}</FieldLabel>
                <Input id="sp-sessions" type="number" min="1" value={form.sessionCount}
                  onChange={(e) => setForm(f => ({ ...f, sessionCount: e.target.value }))} className="rounded-xl" />
              </Field>
              <Field>
                <FieldLabel htmlFor="sp-price">{t('fields.price')}</FieldLabel>
                <Input id="sp-price" type="number" min="0" step="0.01" value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="rounded-xl" />
              </Field>
              <Field>
                <FieldLabel htmlFor="sp-validity">{t('fields.validityDays')}</FieldLabel>
                <Input id="sp-validity" type="number" min="0" value={form.validityDays}
                  onChange={(e) => setForm(f => ({ ...f, validityDays: e.target.value }))}
                  placeholder={t('fields.validityDaysPlaceholder')} className="rounded-xl" />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <FieldLabel htmlFor="sp-active" className="mb-0">{t('fields.isActive')}</FieldLabel>
              <Switch id="sp-active" checked={form.isActive} onCheckedChange={(c) => setForm(f => ({ ...f, isActive: c }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('saving') : t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDialog.description', { name: deleteTarget?.name || '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
