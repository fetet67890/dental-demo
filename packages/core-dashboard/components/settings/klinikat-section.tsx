"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { Badge } from '@core/components/ui/badge'
import { Switch } from '@core/components/ui/switch'
import { Field, FieldLabel } from '@core/components/ui/field'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@core/components/ui/alert-dialog'
import { Plus, Building2, Pencil, Trash2, MapPin, Phone, Mail } from 'lucide-react'
import { getClinics, createClinic, updateClinic, deleteClinic, type Clinic } from '@core/lib/api/clinics'

const emptyForm = { name: '', address: '', phone: '', email: '', description: '', isActive: true }

export function KlinikatSection() {
  const t = useTranslations('klinikat-section')
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Clinic | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null)

  const load = () => {
    setLoading(true)
    getClinics().then(setClinics).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true) }
  const openEdit = (c: Clinic) => {
    setEditing(c)
    setForm({ name: c.name, address: c.address, phone: c.phone, email: c.email, description: c.description, isActive: c.isActive })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Emri i klinikës është i detyrueshëm'); return }
    try {
      setSubmitting(true)
      if (editing) {
        await updateClinic(editing.id, form)
        toast.success('Klinika u përditësua')
      } else {
        await createClinic(form)
        toast.success('Klinika u krijua')
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteClinic(deleteTarget.id)
      toast.success('Klinika u fshi')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-2" />
            {t('addButton')}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : clinics.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t('emptyState')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clinics.map(c => (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {c.name}
                  </CardTitle>
                  <Badge variant={c.isActive ? 'default' : 'secondary'}>
                    {c.isActive ? t('active') : t('inactive')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {c.address && <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{c.address}</p>}
                  {c.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
                  {c.email && <p className="text-muted-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</p>}
                  {c.description && <p className="text-muted-foreground">{c.description}</p>}
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> {t('edit')}
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {t('delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('dialog.editTitle') : t('addButton')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="cname">{t('dialog.nameLabel')}</FieldLabel>
              <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="caddress">{t('dialog.addressLabel')}</FieldLabel>
              <Input id="caddress" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="cphone">{t('dialog.phoneLabel')}</FieldLabel>
                <Input id="cphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="cemail">{t('dialog.emailLabel')}</FieldLabel>
                <Input id="cemail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cdesc">{t('dialog.descriptionLabel')}</FieldLabel>
              <Textarea id="cdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="cactive">{t('dialog.activeLabel')}</FieldLabel>
              <Switch id="cactive" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? t('dialog.saving') : editing ? t('dialog.save') : t('dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: deleteTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
