"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Switch } from "@core/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Loader2, Images } from "lucide-react"
import { PageLoadingGuard } from "@core/components/ui/page-loading-guard"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import { ContentImageField } from "./content-image-field"
import {
  getGalleryImages, createGalleryImage, updateGalleryImage, deleteGalleryImage,
  type GalleryImage, type GalleryTag,
} from "@core/lib/api/gallery"

const EMPTY_FORM = { tag: "clinic" as GalleryTag, imagePath: null as string | null, caption: "", sortOrder: 0, isActive: true }

export function GaleriaSection() {
  const t = useTranslations('galeria-section')
  const TAG_LABELS: Record<GalleryTag, string> = {
    hero: t('tags.hero'),
    team: t('tags.team'),
    clinic: t('tags.clinic'),
    arc_gallery: t('tags.arc_gallery'),
    smile_ticker: t('tags.smile_ticker'),
    before: t('tags.before'),
    after: t('tags.after'),
  }
  const ALL_TAGS = Object.keys(TAG_LABELS) as GalleryTag[]
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState<GalleryTag | "all">("all")
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<GalleryImage | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<GalleryImage | null>(null)

  const load = () => {
    setLoading(true)
    getGalleryImages().then(setImages).catch(() => toast.error("Gabim gjatë ngarkimit")).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = tagFilter === "all" ? images : images.filter((i) => i.tag === tagFilter)

  const closeDialog = () => {
    setIsOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setError("")
  }

  const handleSave = async () => {
    if (!form.imagePath) { setError(t('validation.imageRequired')); return }

    setSaving(true)
    const payload = { tag: form.tag, imagePath: form.imagePath, caption: form.caption.trim() || undefined, sortOrder: form.sortOrder, isActive: form.isActive }
    try {
      if (editing) {
        await updateGalleryImage(editing.id, payload)
        toast.success("Fotoja u përditësua me sukses")
      } else {
        await createGalleryImage(payload)
        toast.success("Fotoja u shtua me sukses")
      }
      closeDialog()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (img: GalleryImage) => {
    setEditing(img)
    setForm({ tag: img.tag, imagePath: img.imagePath, caption: img.caption, sortOrder: img.sortOrder, isActive: img.isActive })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteGalleryImage(deleting.id)
      toast.success("Fotoja u fshi me sukses")
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
                hint={error || undefined}
                value={form.imagePath}
                onChange={(url) => { setForm({ ...form, imagePath: url }); if (error) setError('') }}
              />
              <div className="space-y-2">
                <Label>{t('dialog.categoryLabel')}</Label>
                <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v as GalleryTag })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_TAGS.map((tag) => (
                      <SelectItem key={tag} value={tag}>{TAG_LABELS[tag]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caption">{t('dialog.captionLabel')}</Label>
                <Input id="caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder={t('dialog.captionPlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">{t('dialog.sortOrderLabel')}</Label>
                <Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
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
              <div className="w-full max-w-xs">
                <Select value={tagFilter} onValueChange={(v) => setTagFilter(v as GalleryTag | "all")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories')}</SelectItem>
                    {ALL_TAGS.map((tag) => (
                      <SelectItem key={tag} value={tag}>{TAG_LABELS[tag]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5 shrink-0 ml-auto" onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('addButton')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((img) => (
                  <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.imagePath} alt={img.caption || TAG_LABELS[img.tag]} className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => handleEdit(img)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="secondary" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(img)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <p className="text-[11px] text-white/90 truncate">{TAG_LABELS[img.tag]}</p>
                    </div>
                    {!img.isActive && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full chip-neutral">{t('inactiveBadge')}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : !loading && (
              <div className="text-center py-10 text-muted-foreground">
                <Images className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{t('empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PageLoadingGuard>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
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
