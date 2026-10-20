"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import { Switch } from "@core/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@core/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Star, Loader2, Quote } from "lucide-react"
import { PageLoadingGuard } from "@core/components/ui/page-loading-guard"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import { ContentImageField } from "./content-image-field"
import {
  getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
  type Testimonial,
} from "@core/lib/api/testimonials"

const EMPTY_FORM = {
  name: "", quote: "", title: "", location: "",
  gender: "" as "" | "M" | "F", rating: "" as string, photoPath: null as string | null,
  sortOrder: 0, isActive: true,
}

export function DeshmiteSection() {
  const t = useTranslations('deshmite-section')
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Testimonial | null>(null)

  const load = () => {
    setLoading(true)
    getTestimonials().then(setTestimonials).catch(() => toast.error("Gabim gjatë ngarkimit")).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = testimonials.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.quote.toLowerCase().includes(search.toLowerCase())
  )

  const closeDialog = () => {
    setIsOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('validation.nameRequired')
    if (!form.quote.trim()) e.quote = t('validation.quoteRequired')
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      quote: form.quote.trim(),
      title: form.title.trim() || undefined,
      location: form.location.trim() || undefined,
      gender: form.gender || undefined,
      rating: form.rating ? parseInt(form.rating, 10) : undefined,
      photoPath: form.photoPath || undefined,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    }
    try {
      if (editing) {
        await updateTestimonial(editing.id, payload)
        toast.success("Dëshmia u përditësua me sukses")
      } else {
        await createTestimonial(payload)
        toast.success("Dëshmia u shtua me sukses")
      }
      closeDialog()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (t: Testimonial) => {
    setEditing(t)
    setForm({
      name: t.name, quote: t.quote, title: t.title, location: t.location,
      gender: t.gender ?? "", rating: t.rating != null ? String(t.rating) : "",
      photoPath: t.photoPath, sortOrder: t.sortOrder, isActive: t.isActive,
    })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTestimonial(deleting.id)
      toast.success("Dëshmia u fshi me sukses")
      load()
    } catch {
      toast.error("Gabim gjatë fshirjes")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageLoadingGuard cols={4} rows={6}>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) closeDialog() }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
              <DialogDescription>
                {editing ? t('dialog.editDescription') : t('dialog.addDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <ContentImageField
                label={t('dialog.photoLabel')}
                hint={t('dialog.photoHint')}
                value={form.photoPath}
                onChange={(url) => setForm({ ...form, photoPath: url })}
              />
              <div className="space-y-2">
                <Label htmlFor="name">{t('dialog.nameLabel')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors(p => ({ ...p, name: '' })) }}
                  placeholder={t('dialog.namePlaceholder')}
                  className={cn(errors.name && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote">{t('dialog.quoteLabel')}</Label>
                <Textarea
                  id="quote"
                  value={form.quote}
                  onChange={(e) => { setForm({ ...form, quote: e.target.value }); if (errors.quote) setErrors(p => ({ ...p, quote: '' })) }}
                  placeholder={t('dialog.quotePlaceholder')}
                  className={cn(errors.quote && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.quote && <p className="text-xs text-destructive mt-1">{errors.quote}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('dialog.titleLabel')}</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('dialog.titlePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">{t('dialog.locationLabel')}</Label>
                  <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t('dialog.locationPlaceholder')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('dialog.ratingLabel')}</Label>
                  <Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                    <SelectTrigger><SelectValue placeholder={t('dialog.ratingPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} <Star className="inline h-3 w-3 ml-1" /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">{t('dialog.sortOrderLabel')}</Label>
                  <Input
                    id="sortOrder" type="number" value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">{t('dialog.activeLabel')}</Label>
                <Switch id="active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t('dialog.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? t('dialog.saveChanges') : t('dialog.addSubmit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <SearchInput placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="flex-1 max-w-sm" />
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5 shrink-0" onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('addButton')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.testimonial')}</TableHead>
                    <TableHead>{t('table.roleLocation')}</TableHead>
                    <TableHead>{t('table.rating')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-start gap-2 max-w-sm">
                          <Quote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{item.quote}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{[item.title, item.location].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell>{item.rating ? <span className="flex items-center gap-1">{item.rating} <Star className="h-3.5 w-3.5 fill-current" /></span> : "—"}</TableCell>
                      <TableCell>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', item.isActive ? 'chip-green' : 'chip-neutral')}>
                          {item.isActive ? t('status.active') : t('status.inactive')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(item)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('empty')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden divide-y divide-border">
              {filtered.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.quote}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(item)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', item.isActive ? 'chip-green' : 'chip-neutral')}>
                      {item.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageLoadingGuard>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.prefix')} <span className="font-semibold text-foreground">&quot;{deleting?.name}&quot;</span>{t('deleteDialog.suffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">{t('deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
